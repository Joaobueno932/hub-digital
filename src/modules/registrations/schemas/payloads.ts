import { z } from "zod";

/**
 * Schemas dos payloads (JSONB) de RegistrationRequest, por tipo.
 * O payload nunca é renderizado bruto: ele é validado aqui e, se inválido ou
 * legado, a UI exibe um estado seguro para o administrador.
 */

export const userPayloadSchema = z.object({
  contactName: z.string().min(1),
  contactEmail: z.email(),
  contactPhone: z.string().optional(),
});

export const organizationPayloadSchema = z.object({
  organizationName: z.string().min(2),
  contactName: z.string().min(1),
  contactEmail: z.email(),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
});

export type UserPayload = z.infer<typeof userPayloadSchema>;
export type OrganizationPayload = z.infer<typeof organizationPayloadSchema>;

export type ParsedPayload =
  | { ok: true; type: "USER"; data: UserPayload }
  | { ok: true; type: "STARTUP" | "ESPACO_INOVACAO"; data: OrganizationPayload }
  | { ok: false; error: string };

export function parseRegistrationPayload(
  type: string,
  payload: unknown,
): ParsedPayload {
  if (type === "USER") {
    const parsed = userPayloadSchema.safeParse(payload);
    return parsed.success
      ? { ok: true, type: "USER", data: parsed.data }
      : {
          ok: false,
          error: "Payload de usuário inválido ou em formato legado.",
        };
  }
  if (type === "STARTUP" || type === "ESPACO_INOVACAO") {
    const parsed = organizationPayloadSchema.safeParse(payload);
    return parsed.success
      ? { ok: true, type, data: parsed.data }
      : {
          ok: false,
          error: "Payload de organização inválido ou em formato legado.",
        };
  }
  return { ok: false, error: "Tipo de solicitação desconhecido." };
}
