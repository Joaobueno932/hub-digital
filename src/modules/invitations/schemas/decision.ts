import { z } from "zod";

export const invitationTokenSchema = z.object({
  token: z.string().trim().min(20).max(200),
});

export type InvitationTokenInput = z.infer<typeof invitationTokenSchema>;

/**
 * Callback de retorno pós-login: só aceita caminho interno (`/...`), nunca
 * um domínio externo — proteção contra open redirect (item 8 do enunciado).
 */
export function sanitizeInternalCallback(
  raw: string | null | undefined,
): string {
  if (!raw) return "/app";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}
