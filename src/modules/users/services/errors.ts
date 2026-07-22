/** Erros de negócio da administração de usuários — mapeados na action. */

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado.");
    this.name = "UserNotFoundError";
  }
}

export class UserConflictError extends Error {
  constructor() {
    super(
      "Este usuário foi alterado por outra pessoa. Recarregue e tente novamente.",
    );
    this.name = "UserConflictError";
  }
}

/** O ator tentou suspender a própria conta. */
export class SelfSuspensionError extends Error {
  constructor() {
    super("Você não pode suspender a própria conta.");
    this.name = "SelfSuspensionError";
  }
}

/** Apenas SUPER_ADMIN administra outro SUPER_ADMIN. */
export class SuperAdminProtectedError extends Error {
  constructor() {
    super("Apenas um super administrador pode administrar esta conta.");
    this.name = "SuperAdminProtectedError";
  }
}

/** A operação deixaria a plataforma sem nenhum SUPER_ADMIN ativo. */
export class LastSuperAdminError extends Error {
  constructor() {
    super("Este é o último super administrador ativo — a ação foi bloqueada.");
    this.name = "LastSuperAdminError";
  }
}
