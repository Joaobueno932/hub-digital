import { prisma } from "@/lib/prisma";
import type { OnboardingProfile } from "@/generated/prisma/client";

export type OnboardingState = "NOT_STARTED" | "DRAFT" | "COMPLETED";

/**
 * Carrega o onboarding SEMPRE pelo userId da sessão (nunca por id vindo do
 * cliente). NOT_STARTED é a ausência de registro.
 */
export async function getOnboardingProfile(
  userId: string,
): Promise<OnboardingProfile | null> {
  return prisma.onboardingProfile.findUnique({ where: { userId } });
}

export function onboardingStateOf(
  profile: OnboardingProfile | null,
): OnboardingState {
  if (!profile) return "NOT_STARTED";
  return profile.status === "COMPLETED" ? "COMPLETED" : "DRAFT";
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState> {
  return onboardingStateOf(await getOnboardingProfile(userId));
}
