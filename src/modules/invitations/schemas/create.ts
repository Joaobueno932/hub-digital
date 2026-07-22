import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.normalize("NFKC"))
    .pipe(z.email()),
  roleCode: z.string().trim().min(1).max(60),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize("NFKC");
}
