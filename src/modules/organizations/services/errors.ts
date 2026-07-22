/** Erros de negócio da edição/suspensão de organizações — mapeados na action. */

export class OrganizationNotFoundError extends Error {
  constructor() {
    super("Organização não encontrada.");
    this.name = "OrganizationNotFoundError";
  }
}

/** OCC: a organização foi alterada por outra pessoa entre a leitura e a gravação. */
export class OrganizationConflictError extends Error {
  constructor() {
    super(
      "Esta organização foi alterada por outra pessoa. Recarregue e tente novamente.",
    );
    this.name = "OrganizationConflictError";
  }
}

export class OrganizationScopeError extends Error {
  constructor() {
    super("Você não tem permissão sobre esta organização.");
    this.name = "OrganizationScopeError";
  }
}

export class OrganizationAlreadyInStatusError extends Error {
  constructor() {
    super("A organização já está neste status.");
    this.name = "OrganizationAlreadyInStatusError";
  }
}
