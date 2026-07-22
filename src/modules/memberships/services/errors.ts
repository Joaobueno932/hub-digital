/** Erros de negócio da gestão de membros — mapeados na action para mensagens seguras. */

export class MembershipNotFoundError extends Error {
  constructor() {
    super("Vínculo não encontrado.");
    this.name = "MembershipNotFoundError";
  }
}

export class MembershipConflictError extends Error {
  constructor() {
    super(
      "Este vínculo já foi alterado por outra pessoa. Recarregue e tente novamente.",
    );
    this.name = "MembershipConflictError";
  }
}

/** Disparado quando a ação deixaria a organização sem nenhum administrador ativo. */
export class LastAdminError extends Error {
  constructor() {
    super(
      "Esta é a última pessoa administradora ativa da organização — a ação foi bloqueada.",
    );
    this.name = "LastAdminError";
  }
}

export class RoleNotAllowedError extends Error {
  constructor() {
    super("Este papel não é permitido para o tipo desta organização.");
    this.name = "RoleNotAllowedError";
  }
}

export class SelfElevationError extends Error {
  constructor() {
    super("Você não pode atribuir um papel de autoridade maior que a sua.");
    this.name = "SelfElevationError";
  }
}

export class DuplicateMembershipError extends Error {
  constructor() {
    super("Este usuário já possui um vínculo ativo com esta organização.");
    this.name = "DuplicateMembershipError";
  }
}
