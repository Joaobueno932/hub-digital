import { prisma } from "@/lib/prisma";
import {
  isRoleAllowedForOrgType,
  SUPER_ADMIN_ROLE,
} from "@/modules/memberships/config/role-matrix";
import { computeExpiresAt } from "../config";
import { generateInvitationToken, hashInvitationToken } from "../lib/token";
import {
  DuplicateInvitationError,
  DuplicateMembershipError,
  InvitationRoleNotAllowedError,
} from "./errors";

/**
 * Cria um convite. Sequência: valida papel permitido para o tipo da
 * organização, bloqueia SUPER_ADMIN, serializa por organização+e-mail via
 * advisory lock (mesma técnica de `submit-registration.ts`) para evitar
 * duplicidade sob concorrência, checa membro/convite existentes, gera token
 * (retornado apenas em memória — só o hash é persistido) e audita sem o
 * token.
 */
export async function createInvitation(input: {
  organizationId: string;
  email: string;
  roleCode: string;
  actorId: string;
}): Promise<{ invitationId: string; token: string; expiresAt: Date }> {
  const organization = await prisma.organization.findFirstOrThrow({
    where: { id: input.organizationId, deletedAt: null },
    include: { type: true },
  });

  if (
    input.roleCode === SUPER_ADMIN_ROLE ||
    !isRoleAllowedForOrgType(organization.type.code, input.roleCode)
  ) {
    throw new InvitationRoleNotAllowedError();
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: { code: input.roleCode },
  });

  const lockKey = `invitation-create:${input.organizationId}:${input.email}`;

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const existingUser = await tx.user.findUnique({
      where: { email: input.email },
    });
    if (existingUser) {
      const existingMembership = await tx.membership.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: input.organizationId,
          status: "ACTIVE",
          deletedAt: null,
        },
      });
      if (existingMembership) throw new DuplicateMembershipError();
    }

    const now = new Date();
    const existingInvite = await tx.organizationInvitation.findFirst({
      where: {
        organizationId: input.organizationId,
        email: input.email,
        status: "PENDING",
        expiresAt: { gt: now },
      },
    });
    if (existingInvite) throw new DuplicateInvitationError();

    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = computeExpiresAt(now);

    const invitation = await tx.organizationInvitation.create({
      data: {
        organizationId: input.organizationId,
        email: input.email,
        roleId: role.id,
        tokenHash,
        invitedById: input.actorId,
        expiresAt,
      },
    });

    if (existingUser) {
      await tx.notification.create({
        data: {
          userId: existingUser.id,
          type: "invitation.created",
          title: "Você recebeu um convite",
          body: `Você foi convidado(a) para ${organization.name}. Peça o link de acesso a quem enviou o convite (envio de e-mail real ainda não implementado).`,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: "invitation.created",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { email: input.email, role: input.roleCode },
      },
    });

    return { invitationId: invitation.id, token, expiresAt };
  });
}
