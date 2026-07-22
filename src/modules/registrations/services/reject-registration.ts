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

  // Conflito detectado ANTES da transação (solicitação já processada): é o
  // caso comum de clicar em já-decidida, não auditado — mantém o comportamento
  // existente e fica fora do try, logo não cai no catch abaixo.
  if (request.status !== "PENDING") throw new RegistrationConflictError();

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.registrationRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          decidedById: input.actorId,
          decidedAt: new Date(),
          decisionReason: reason,
        },
      });
      // Conflito de corrida (outra requisição venceu entre a checagem e o
      // updateMany). A auditoria NÃO é gravada aqui: qualquer escrita dentro
      // da transação é revertida quando lançamos o erro. Vai no catch, fora
      // da transação.
      if (claimed.count === 0) throw new RegistrationConflictError();

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
  } catch (error) {
    // Só o conflito de corrida (lançado de dentro da transação) chega aqui —
    // o pré-check acima lança antes do try. O registro é feito fora da
    // transação revertida, sem duplicar (a segunda chamada sequencial cai no
    // pré-check e não audita).
    if (error instanceof RegistrationConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: input.actorOrganizationId,
          action: "registration_request.processing_conflict",
          entityType: "registration_request",
          entityId: request.id,
          metadata: { attempted: "reject" },
        },
      });
    }
    throw error;
  }
}
