import {
  getOnboardingState,
  type OnboardingState,
} from "./get-onboarding-profile";

export const ONBOARDING_PATH = "/app/onboarding";
export const AUTHENTICATED_HOME = "/app";

/** Regra pura de destino pós-login (testável sem banco). */
export function postLoginRedirectForState(state: OnboardingState): string {
  return state === "COMPLETED" ? AUTHENTICATED_HOME : ONBOARDING_PATH;
}

/**
 * Destino pós-login do usuário autenticado:
 * - sem onboarding ou rascunho → /app/onboarding
 * - concluído → /app
 * A decisão é centralizada aqui; o formulário de login não a duplica.
 */
export async function resolvePostLoginRedirect(
  userId: string,
): Promise<string> {
  return postLoginRedirectForState(await getOnboardingState(userId));
}
