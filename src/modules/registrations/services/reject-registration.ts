import { prisma } from "@/lib/prisma";
import {
  RegistrationConflictError,
  RegistrationNotFoundError,
  SelfReviewError,
} from "./errors";

/**
 * Reprova uma solicitação com justificativa obrigatória.
 * Mesmo padrão de concorrência/idempotência da aprovação (updateMany + status).
 * Não apaga dados, não cria organização nem vínculo.
 */
export async function rejectRegistrationRequest(input: {
  requestId: string;
  actorId: string;
  actorOrganizationId: string | null;
  reason: string;
}): Promise<{ requestId: string }> {
  const reason = input.reason.trim();

  const request = await prisma.registrationRequest.findUnique({
    where: { id: input.requestId },
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
        metadata: { attempted: "reject" },
      },
    });
    throw new SelfReviewError();
  }

  if (request.status !== "PENDING") throw new RegistrationConflictError();

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.registrationRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: "REJECTED",
        decidedById: input.actorId,
        decidedAt: new Date(),
        decisionReason: reason,
      },
    });
    if (claimed.count === 0) {
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: input.actorOrganizationId,
          action: "registration_request.processing_conflict",
          entityType: "registration_request",
          entityId: request.id,
          metadata: { attempted: "reject" },
        },
      });
      throw new RegistrationConflictError();
    }

    if (request.requesterId) {
      await tx.notification.create({
        data: {
          userId: request.requesterId,
          type: "registration.rejected",
          title: "Cadastro não aprovado",
          body: `Sua solicitação não foi aprovada. Justificativa: ${reason}`,
          link: "/app",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.actorOrganizationId,
        action: "registration_request.rejected",
        entityType: "registration_request",
        entityId: request.id,
        metadata: {
          previousStatus: "PENDING",
          newStatus: "REJECTED",
          type: request.type,
        },
      },
    });

    return { requestId: request.id };
  });
}
