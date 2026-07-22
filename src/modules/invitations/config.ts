/**
 * Validade do convite em dias — decisão inicial ajustável (ver
 * docs/decisoes-tecnicas.md). Não há job agendado nesta etapa: convites
 * vencidos são tratados como EXPIRED sob demanda (leitura/processamento),
 * mesmo que o status persistido ainda esteja PENDING.
 */
export const INVITATION_EXPIRATION_DAYS = 7;

export function computeExpiresAt(from: Date = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITATION_EXPIRATION_DAYS);
  return expires;
}
