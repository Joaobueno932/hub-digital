import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null));

/**
 * Campos editáveis da organização — apenas os já confirmados pelo modelo
 * (ver docs/modelo-dados.md e docs/pendencias-negocio.md). CNPJ, endereço
 * completo, faturamento e valuation não existem e não são inventados aqui.
 */
export const updateOrganizationSchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  displayName: optionalText(120),
  description: optionalText(2000),
  website: optionalText(200),
  city: optionalText(120),
  state: optionalText(2),
  expectedUpdatedAt: z.iso.datetime(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
