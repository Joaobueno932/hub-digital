import { prisma } from "@/lib/prisma";
import type { RegistrationType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { SubmissionConflictError } from "./errors";
import { notifyRegistrationAdmins } from "./notify-admins";

/**
 * Cria uma solicitação institucional (STARTUP ou ESPACO_INOVACAO) como PENDING.
 *
 * - O tipo vem da action/rota (nunca do payload do cliente).
 * - `requesterId` é sempre o usuário da sessão.
 * - NÃO cria organização, vínculo ou papel — isso continua acontecendo apenas
 *   na aprovação administrativa.
 *
 * Duplicidade/concorrência: um advisory lock transacional por (usuário, tipo)
 * serializa submissões concorrentes (duplo clique, duas abas, repetição da
 * action). Já existindo uma solicitação do mesmo tipo, a segunda recebe
 * SubmissionConflictError — sem reabertura silenciosa de REJECTED/APPROVED.
 * (Optou-se por advisory lock em vez de índice único parcial para não
 * conflitar com o conjunto de dados de seed/testes existentes; ver
 * docs/decisoes-tecnicas.md.)
 */
export async function submitRegistrationRequest(input: {
  type: RegistrationType;
  requesterId: string;
  payload: Record<string, unknown>;
  actorOrganizationId: string | null;
}): Promise<{ requestId: string; notifiedAdmins: number }> {
  const lockKey = `registration-submit:${input.requesterId}:${input.type}`;

  return prisma.$transaction(async (tx) => {
    // Serializa submissões concorrentes do mesmo usuário+tipo até o fim da tx.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const existing = await tx.registrationRequest.findFirst({
      where: { requesterId: input.requesterId, type: input.type },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });
    if (existing && existing.status !== "RESUBMITTED") {
      throw new SubmissionConflictError(
        existing.status as "PENDING" | "APPROVED" | "REJECTED",
      );
    }

    // Remove chaves undefined para um JSON limpo no banco.
    const cleanPayload = JSON.parse(
      JSON.stringify(input.payload),
    ) as Prisma.InputJsonObject;

    const created = await tx.registrationRequest.create({
      data: {
        type: input.type,
        requesterId: input.requesterId,
        payload: cleanPayload,
        status: "PENDING",
      },
      select: { id: true },
    });

    // Auditoria: metadados seguros (sem payload completo, telefone, termos ou IP).
    await tx.auditLog.create({
      data: {
        actorId: input.requesterId,
        organizationId: input.actorOrganizationId,
        action: "registration_request.submitted",
        entityType: "registration_request",
        entityId: created.id,
        metadata: {
          type: input.type,
          status: "PENDING",
          source: "public_form",
          schemaVersion:
            typeof input.payload.schemaVersion === "number"
              ? input.payload.schemaVersion
              : null,
        } satisfies Prisma.InputJsonObject,
      },
    });

    const notifiedAdmins = await notifyRegistrationAdmins(tx);

    return { requestId: created.id, notifiedAdmins };
  });
}

/** Solicitações do próprio usuário (escopo por sessão — nunca por id do cliente). */
export async function listMyRegistrationRequests(userId: string) {
  return prisma.registrationRequest.findMany({
    where: { requesterId: userId },
    include: { resultingOrganization: { include: { type: true } } },
    orderBy: { createdAt: "desc" },
  });
}
