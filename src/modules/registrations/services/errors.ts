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
