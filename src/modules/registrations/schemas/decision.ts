import { z } from "zod";

export const approveInputSchema = z.object({
  requestId: z.uuid(),
});

export const rejectInputSchema = z.object({
  requestId: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "A justificativa deve ter pelo menos 10 caracteres.")
    .max(1000, "A justificativa deve ter no máximo 1000 caracteres."),
});

export type ApproveInput = z.infer<typeof approveInputSchema>;
export type RejectInput = z.infer<typeof rejectInputSchema>;
