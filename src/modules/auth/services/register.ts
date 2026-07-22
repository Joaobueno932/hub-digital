import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "../schemas/register";

export type RegisterResult = { ok: true } | { ok: false; error: string };

/**
 * Cadastro de usuário comum.
 * Resposta idêntica quando o e-mail já existe (anti-enumeração): o chamador
 * exibe sempre a mesma mensagem de sucesso genérica.
 */
export async function registerUser(
  input: RegisterInput,
): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    // Não revela existência da conta.
    return { ok: true };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      // ACTIVE no MVP para usuário comum; solicitações de startup/espaço
      // passam por RegistrationRequest com aprovação.
      status: "ACTIVE",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.registered",
      entityType: "user",
      entityId: user.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "welcome",
      title: "Boas-vindas ao Hub Digital",
      body: "Complete o seu onboarding para personalizarmos a sua experiência.",
      link: "/app/onboarding",
    },
  });

  return { ok: true };
}
