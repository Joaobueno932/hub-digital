import { prisma } from "@/lib/prisma";
import { parseRegistrationPayload } from "../schemas/payloads";
import {
  InvalidPayloadError,
  RegistrationConflictError,
  RegistrationNotFoundError,
  SelfReviewError,
} from "./errors";

const ROLE_BY_TYPE: Record<string, string> = {
  STARTUP: "ADM_STARTUP",
  ESPACO_INOVACAO: "ADM_ESPACO_INOVACAO",
};

const ORG_TYPE_BY_TYPE: Record<string, string> = {
  STARTUP: "STARTUP",
  ESPACO_INOVACAO: "ESPACO_INOVACAO",
};

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export type ApproveResult = {
  requestId: string;
  organizationId: string | null;
  membershipId: string | null;
};

/**
 * Aprova uma solicitação de cadastro.
 *
 * Concorrência/idempotência: dentro da transação, um `updateMany` condicionado
 * a `status: PENDING` "reivindica" a solicitação. Se outra requisição já a
 * processou (duplo clique, duas abas, reenvio), `count === 0` e a operação
 * inteira é abortada com RegistrationConflictError — nenhuma entidade,
 * notificação ou auditoria duplicada é criada.
 */
export async function approveRegistrationRequest(input: {
  requestId: string;
  actorId: string;
  actorOrganizationId: string | null;
}): Promise<ApproveResult> {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: input.requestId },
    include: { requester: true },
  });
  if (!request) throw new RegistrationNotFoundError();

  if (request.requesterId && request.requesterId === input.actorId) {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.actorOrganizationId,
        action: "registration_request.self_review_blocked",
        entityType: "registration_request",
        entityId: request.id,
        metadata: { attempted: "approve" },
      },
    });
    throw new SelfReviewError();
  }

  // Conflito detectado ANTES da transação (já processada): caso comum,
  // não auditado — fica fora do try para não cair no catch abaixo.
  if (request.status !== "PENDING") throw new RegistrationConflictError();

  const parsed = parseRegistrationPayload(request.type, request.payload);
  if (!parsed.ok) throw new InvalidPayloadError();

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.registrationRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: {
          status: "APPROVED",
          decidedById: input.actorId,
          decidedAt: new Date(),
        },
      });
      // Conflito de corrida: NÃO auditar aqui (a transação será revertida).
      // O registro é feito no catch, fora da transação.
      if (claimed.count === 0) throw new RegistrationConflictError();

      let organizationId: string | null = null;
      let membershipId: string | null = null;

      if (parsed.type === "USER") {
        // Ativa o usuário correspondente sem criar organização nem duplicar conta.
        if (request.requesterId) {
          await tx.user.update({
            where: { id: request.requesterId },
            data: { status: "ACTIVE" },
          });
        } else {
          const existing = await tx.user.findUnique({
            where: { email: parsed.data.contactEmail.toLowerCase() },
          });
          if (existing) {
            await tx.user.update({
              where: { id: existing.id },
              data: { status: "ACTIVE" },
            });
          }
          // Sem conta prévia: a criação de credenciais ocorrerá no fluxo de convite
          // (etapa futura); a aprovação fica registrada mesmo assim.
        }
      } else {
        const orgType = await tx.organizationType.findUniqueOrThrow({
          where: { code: ORG_TYPE_BY_TYPE[parsed.type] },
        });

        const base = slugify(parsed.data.organizationName) || "organizacao";
        let slug = base;
        for (
          let i = 2;
          await tx.organization.findUnique({ where: { slug } });
          i += 1
        ) {
          slug = `${base}-${i}`;
        }

        const organization = await tx.organization.create({
          data: {
            name: parsed.data.organizationName,
            slug,
            typeId: orgType.id,
            description: parsed.data.description,
            status: "ACTIVE",
            createdById: input.actorId,
          },
        });
        organizationId = organization.id;

        await tx.auditLog.create({
          data: {
            actorId: input.actorId,
            organizationId: organization.id,
            action: "organization.created_from_registration",
            entityType: "organization",
            entityId: organization.id,
            metadata: { registrationRequestId: request.id, type: parsed.type },
          },
        });

        if (request.requesterId) {
          const role = await tx.role.findUniqueOrThrow({
            where: { code: ROLE_BY_TYPE[parsed.type] },
          });
          const membership = await tx.membership.upsert({
            where: {
              userId_organizationId: {
                userId: request.requesterId,
                organizationId: organization.id,
              },
            },
            update: { status: "ACTIVE" },
            create: {
              userId: request.requesterId,
              organizationId: organization.id,
              status: "ACTIVE",
              createdById: input.actorId,
            },
          });
          membershipId = membership.id;
          await tx.membershipRole.upsert({
            where: {
              membershipId_roleId: {
                membershipId: membership.id,
                roleId: role.id,
              },
            },
            update: {},
            create: {
              membershipId: membership.id,
              roleId: role.id,
              assignedById: input.actorId,
            },
          });
          await tx.auditLog.create({
            data: {
              actorId: input.actorId,
              organizationId: organization.id,
              action: "membership.created_from_registration",
              entityType: "membership",
              entityId: membership.id,
              metadata: {
                registrationRequestId: request.id,
                role: ROLE_BY_TYPE[parsed.type],
              },
            },
          });
        }
      }

      await tx.registrationRequest.update({
        where: { id: request.id },
        data: {
          resultingOrganizationId: organizationId,
          resultingMembershipId: membershipId,
        },
      });

      if (request.requesterId) {
        await tx.notification.create({
          data: {
            userId: request.requesterId,
            type: "registration.approved",
            title: "Cadastro aprovado",
            body: organizationId
              ? "Sua solicitação foi aprovada e o acesso institucional da sua organização foi criado."
              : "Sua solicitação de cadastro foi aprovada.",
            link: "/app",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: input.actorOrganizationId,
          action: "registration_request.approved",
          entityType: "registration_request",
          entityId: request.id,
          metadata: {
            previousStatus: "PENDING",
            newStatus: "APPROVED",
            type: request.type,
            resultingOrganizationId: organizationId,
            resultingMembershipId: membershipId,
          },
        },
      });

      return { requestId: request.id, organizationId, membershipId };
    });
  } catch (error) {
    // Só o conflito de corrida (lançado de dentro da transação) chega aqui —
    // o pré-check lança antes do try. Registro fora da transação revertida,
    // sem duplicar (a segunda chamada sequencial cai no pré-check).
    if (error instanceof RegistrationConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: input.actorOrganizationId,
          action: "registration_request.processing_conflict",
          entityType: "registration_request",
          entityId: request.id,
          metadata: { attempted: "approve" },
        },
      });
    }
    throw error;
  }
}
