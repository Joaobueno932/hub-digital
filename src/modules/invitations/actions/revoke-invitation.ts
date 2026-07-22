"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { revokeInvitation } from "../services/revoke-invitation";
import {
  InvitationConflictError,
  InvitationNotFoundError,
} from "../services/errors";

export type InvitationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof InvitationConflictError) return error.message;
  if (error instanceof InvitationNotFoundError) return error.message;
  console.error("revoke invitation error", error);
  return "Não foi possível revogar o convite.";
}

export async function revokeInvitationAction(
  _prev: InvitationFormState,
  formData: FormData,
): Promise<InvitationFormState> {
  const ctx = await requirePermission("invitations.manage");
  if (!ctx.activeMembership)
    return { status: "error", message: "Nenhuma organização ativa." };

  const parsed = z.uuid().safeParse(formData.get("invitationId"));
  if (!parsed.success) return { status: "error", message: "Convite inválido." };

  try {
    await revokeInvitation({
      invitationId: parsed.data,
      organizationId: ctx.activeMembership.organizationId,
      actorId: ctx.user.id,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/convites");
  return { status: "success", message: "Convite revogado." };
}
