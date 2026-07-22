import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Informe o seu nome completo.").max(120),
  email: z
    .email("Informe um e-mail válido.")
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .max(200)
    .regex(/[a-zA-Z]/, "A senha deve conter letras.")
    .regex(/[0-9]/, "A senha deve conter números."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
