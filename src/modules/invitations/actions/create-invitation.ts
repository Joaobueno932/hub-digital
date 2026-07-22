"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionForOrganization } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createInvitationSchema } from "../schemas/create";
import { createInvitation } from "../services/create-invitation";
import { ConsoleInvitationEmailSender } from "../services/email";
import {
  DuplicateInvitationError,
  DuplicateMembershipError,
  InvitationRoleNotAllowedError,
} from "../services/errors";

export type InvitationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  devInviteUrl?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof DuplicateInvitationError) return error.message;
  if (error instanceof DuplicateMembershipError) return error.message;
  if (error instanceof InvitationRoleNotAllowedError) return error.message;
  console.error("create invitation error", error);
  return "Não foi possível criar o convite. Tente novamente.";
}

const emailSender = new ConsoleInvitationEmailSender();

export async function createInvitationAction(
  _prev: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const parsedOrgId = z.uuid().safeParse(formData.get("organizationId"));
  if (!parsedOrgId.success)
    return { status: "error", message: "Organização inválida." };
  const organizationId = parsedOrgId.data;

  const ctx = await requirePermissionForOrganization(
    "invitations.manage",
    organizationId,
  );

  const allowed = checkRateLimit(
    `invitation-create:${ctx.user.id}`,
    10,
    60_000,
  );
  if (!allowed)
    return {
      status: "error",
      message: "Muitas tentativas. Aguarde um instante.",
    };

  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email"),
    roleCode: formData.get("roleCode"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    const organization = await prisma.organization.findFirstOrThrow({
      where: { id: organizationId, deletedAt: null },
    });

    const result = await createInvitation({
      organizationId,
      email: parsed.data.email,
      roleCode: parsed.data.roleCode,
      actorId: ctx.user.id,
    });

    const inviteUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}/convites/${result.token}`;
    await emailSender.send({
      to: parsed.data.email,
      organizationName: organization.name,
      inviteUrl,
    });

    revalidatePath("/app/convites");
    revalidatePath("/app/membros");
    revalidatePath(`/app/admin/organizacoes/${organizationId}/membros`);

    return {
      status: "success",
      message: "Convite criado com sucesso.",
      // Envio real de e-mail não está implementado nesta etapa (ver
      // docs/decisoes-tecnicas.md): o link só é exposto aqui, na resposta da
      // action, restrito por `invitations.manage` — nunca gravado em
      // AuditLog/Notification, nunca logado em produção (ver email.ts).
      devInviteUrl: inviteUrl,
    };
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }
}
