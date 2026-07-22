/** Erros de negócio das decisões de cadastro — mapeados para mensagens seguras na action. */

export class RegistrationConflictError extends Error {
  constructor() {
    super("A solicitação já foi processada.");
    this.name = "RegistrationConflictError";
  }
}

export class SelfReviewError extends Error {
  constructor() {
    super("O solicitante não pode analisar a própria solicitação.");
    this.name = "SelfReviewError";
  }
}

export class InvalidPayloadError extends Error {
  constructor() {
    super("O payload da solicitação é inválido e não pode ser aprovado.");
    this.name = "InvalidPayloadError";
  }
}

export class RegistrationNotFoundError extends Error {
  constructor() {
    super("Solicitação não encontrada.");
    this.name = "RegistrationNotFoundError";
  }
}

/**
 * Já existe uma solicitação do mesmo tipo para o usuário.
 * `existingStatus` distingue as mensagens (PENDING/APPROVED/REJECTED) sem
 * expor dados internos.
 */
export class SubmissionConflictError extends Error {
  constructor(
    public readonly existingStatus: "PENDING" | "APPROVED" | "REJECTED",
  ) {
    super("Já existe uma solicitação deste tipo para a sua conta.");
    this.name = "SubmissionConflictError";
  }
}

export class SubmissionRateLimitedError extends Error {
  constructor() {
    super("Muitas tentativas. Tente novamente em instantes.");
    this.name = "SubmissionRateLimitedError";
  }
}

export class SubmissionRejectedError extends Error {
  constructor() {
    super("Não foi possível processar o envio.");
    this.name = "SubmissionRejectedError";
  }
}
