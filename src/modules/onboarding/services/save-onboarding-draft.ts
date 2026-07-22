import { prisma } from "@/lib/prisma";
import type { OnboardingStage } from "@/generated/prisma/enums";
import { OnboardingAlreadyCompletedError } from "./errors";

/**
 * Cria ou atualiza o rascunho do onboarding do usuário da sessão.
 *
 * - COMPLETED nunca é sobrescrito (lança OnboardingAlreadyCompletedError).
 * - A atualização é condicionada a status = DRAFT (guarda de concorrência) e
 *   incrementa `version`.
 * - Corrida de criação (duas abas) é resolvida pela unicidade de userId: o
 *   segundo INSERT falha (P2002) e recai em atualização.
 * - Auditoria: onboarding.started na primeira criação; onboarding.draft_saved
 *   em cada gravação explícita.
 */
export async function saveOnboardingDraft(input: {
  userId: string;
  selectedStage: OnboardingStage;
}): Promise<{ status: "DRAFT" }> {
  const existing = await prisma.onboardingProfile.findUnique({
    where: { userId: input.userId },
  });

  if (existing?.status === "COMPLETED") {
    throw new OnboardingAlreadyCompletedError();
  }

  if (!existing) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.onboardingProfile.create({
          data: {
            userId: input.userId,
            selectedStage: input.selectedStage,
            status: "DRAFT",
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: input.userId,
            action: "onboarding.started",
            entityType: "onboarding_profile",
            entityId: input.userId,
            metadata: {
              selectedStage: input.selectedStage,
              source: "save_draft",
            },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: input.userId,
            action: "onboarding.draft_saved",
            entityType: "onboarding_profile",
            entityId: input.userId,
            metadata: {
              selectedStage: input.selectedStage,
              source: "save_draft",
            },
          },
        });
      });
      return { status: "DRAFT" };
    } catch (error) {
      // Corrida de criação: outra aba já criou o rascunho — atualiza abaixo.
      if (!isUniqueViolation(error)) throw error;
    }
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.onboardingProfile.updateMany({
      where: { userId: input.userId, status: "DRAFT" },
      data: { selectedStage: input.selectedStage, version: { increment: 1 } },
    });
    if (updated.count === 0) {
      // Passou a COMPLETED entre a leitura e a escrita.
      throw new OnboardingAlreadyCompletedError();
    }
    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        action: "onboarding.draft_saved",
        entityType: "onboarding_profile",
        entityId: input.userId,
        metadata: { selectedStage: input.selectedStage, source: "save_draft" },
      },
    });
  });

  return { status: "DRAFT" };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
