import { z } from "zod";
import { ONBOARDING_STAGE_VALUES } from "../config/stages";

/**
 * O frontend envia apenas o dado necessário para a seleção.
 * userId, status e completedAt nunca vêm do cliente — são resolvidos no servidor.
 */
export const saveDraftSchema = z.object({
  selectedStage: z.enum(ONBOARDING_STAGE_VALUES, {
    message: "Selecione uma das opções para continuar.",
  }),
});

export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

// A conclusão não recebe dados de estágio do cliente: valida o rascunho no servidor.
export const completeSchema = z.object({});
export type CompleteInput = z.infer<typeof completeSchema>;
