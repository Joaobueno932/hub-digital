/** Erros de negócio do ciclo de vida de convites — mapeados na action. */

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Convite não encontrado.");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationConflictError extends Error {
  constructor() {
    super("Este convite já foi processado.");
    this.name = "InvitationConflictError";
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super("Este convite expirou.");
    this.name = "InvitationExpiredError";
  }
}

export class EmailMismatchError extends Error {
  constructor() {
    super("Este convite foi enviado para outro e-mail.");
    this.name = "EmailMismatchError";
  }
}

export class DuplicateInvitationError extends Error {
  constructor() {
    super("Já existe um convite pendente para este e-mail nesta organização.");
    this.name = "DuplicateInvitationError";
  }
}

export class DuplicateMembershipError extends Error {
  constructor() {
    super("Este e-mail já pertence a um membro ativo desta organização.");
    this.name = "DuplicateMembershipError";
  }
}

export class InvitationRoleNotAllowedError extends Error {
  constructor() {
    super("Este papel não é permitido para o tipo desta organização.");
    this.name = "InvitationRoleNotAllowedError";
  }
}
