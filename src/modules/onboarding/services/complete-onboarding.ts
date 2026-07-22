import { prisma } from "@/lib/prisma";
import {
  OnboardingCompletionConflictError,
  OnboardingNotReadyError,
} from "./errors";

/**
 * Conclui o onboarding do usuário da sessão.
 *
 * Idempotência/concorrência: a transição usa `updateMany` condicionado a
 * status = DRAFT (OCC). Uma segunda finalização (duplo clique, duas abas) não
 * casa a condição → count 0 → conflito, sem duplicar notificação, auditoria de
 * conclusão ou alterar completedAt/estágio.
 */
export async function completeOnboarding(input: {
  userId: string;
}): Promise<{ status: "COMPLETED" }> {
  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: input.userId },
  });

  if (!profile || !profile.selectedStage) {
    // Sem rascunho válido / sem estágio escolhido.
    throw new OnboardingNotReadyError();
  }

  if (profile.status === "COMPLETED") {
    throw new OnboardingCompletionConflictError();
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.onboardingProfile.updateMany({
      where: { userId: input.userId, status: "DRAFT" },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (claimed.count === 0) {
      await tx.auditLog.create({
        data: {
          actorId: input.userId,
          action: "onboarding.completion_conflict",
          entityType: "onboarding_profile",
          entityId: input.userId,
          metadata: { reason: "already_processed" },
        },
      });
      throw new OnboardingCompletionConflictError();
    }

    await tx.notification.create({
      data: {
        userId: input.userId,
        type: "onboarding.completed",
        title: "Perfil inicial concluído",
        body: "Seu estágio no Hub Digital foi registrado com sucesso.",
        link: "/app/onboarding/concluido",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        action: "onboarding.completed",
        entityType: "onboarding_profile",
        entityId: input.userId,
        metadata: {
          selectedStage: profile.selectedStage,
          previousStatus: "DRAFT",
          newStatus: "COMPLETED",
          version: profile.version + 1,
        },
      },
    });

    return { status: "COMPLETED" };
  });
}
