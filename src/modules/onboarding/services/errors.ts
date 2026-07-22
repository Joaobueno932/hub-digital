/** Erros de negócio do onboarding — traduzidos para mensagens seguras nas actions. */

export class OnboardingAlreadyCompletedError extends Error {
  constructor() {
    super("O onboarding já foi concluído e não pode ser alterado.");
    this.name = "OnboardingAlreadyCompletedError";
  }
}

export class OnboardingNotReadyError extends Error {
  constructor() {
    super("Selecione o seu estágio antes de concluir o onboarding.");
    this.name = "OnboardingNotReadyError";
  }
}

export class OnboardingCompletionConflictError extends Error {
  constructor() {
    super("O onboarding já foi processado.");
    this.name = "OnboardingCompletionConflictError";
  }
}
