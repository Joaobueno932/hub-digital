import { randomBytes, createHash } from "node:crypto";

/**
 * Token de convite: 256 bits de entropia via `randomBytes`, codificado em
 * base64url para uso seguro em URL. Armazenamos apenas o hash (sha256) —
 * nunca o token em texto puro (ver docs/decisoes-tecnicas.md).
 *
 * sha256 (rápido) é suficiente aqui porque o segredo já tem entropia alta;
 * diferente de senhas (baixa entropia), não há necessidade de um hash lento
 * como bcrypt para se defender de força bruta.
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
