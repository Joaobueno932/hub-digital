import { z } from "zod";

/**
 * Campos editáveis pela administração.
 *
 * Deliberadamente fora: **senha** (nunca editável por terceiros), **e-mail**
 * (não há fluxo de confirmação — permanece somente leitura, registrado em
 * docs/pendencias-negocio.md), **papéis e organizações** (só pelos serviços de
 * membership da Etapa 1.8) e **status** (tem serviço próprio de
 * suspensão/reativação, com guardas e auditoria).
 */
export const updateUserSchema = z.object({
  userId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  expectedUpdatedAt: z.iso.datetime(),
});

export const suspendUserSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
});

export const reactivateUserSchema = z.object({
  userId: z.uuid(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
