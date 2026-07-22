"use server";

import { registerSchema } from "../schemas/register";
import { registerUser } from "../services/register";
import { checkRateLimit } from "@/lib/rate-limit";

export type RegisterActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function registerAction(
  _prev: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      fieldErrors: z_flatten(parsed.error),
    };
  }

  if (!checkRateLimit(`register:${parsed.data.email}`, 5)) {
    return {
      status: "error",
      message: "Muitas tentativas. Tente novamente em instantes.",
    };
  }

  await registerUser(parsed.data);

  // Mensagem única independentemente de o e-mail já existir (anti-enumeração).
  return {
    status: "success",
    message: "Cadastro recebido. Você já pode entrar com o seu e-mail e senha.",
  };
}

function z_flatten(error: import("zod").ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
