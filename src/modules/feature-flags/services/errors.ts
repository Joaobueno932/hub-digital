/** Erros de negócio das feature flags — mapeados para mensagens seguras na action. */

export class UnknownFeatureFlagError extends Error {
  constructor() {
    super("Feature flag desconhecida.");
    this.name = "UnknownFeatureFlagError";
  }
}

export class FeatureFlagForbiddenError extends Error {
  constructor() {
    super("Esta feature flag só pode ser alterada por um super administrador.");
    this.name = "FeatureFlagForbiddenError";
  }
}

export class FeatureFlagConflictError extends Error {
  constructor() {
    super(
      "Esta feature flag foi alterada por outra pessoa. Recarregue e tente novamente.",
    );
    this.name = "FeatureFlagConflictError";
  }
}

export class FeatureFlagOverrideNotFoundError extends Error {
  constructor() {
    super("Esta organização não possui override para esta feature flag.");
    this.name = "FeatureFlagOverrideNotFoundError";
  }
}

export class OrganizationNotFoundError extends Error {
  constructor() {
    super("Organização não encontrada.");
    this.name = "OrganizationNotFoundError";
  }
}
