"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/authz";
import { invitationTokenSchema } from "../schemas/decision";
import { acceptInvitation } from "../services/accept-invitation";
import { declineInvitation } from "../services/decline-invitation";
import {
  EmailMismatchError,
  InvitationConflictError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from "../services/errors";

export type InvitationDecisionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof InvitationNotFoundError) return error.message;
  if (error instanceof InvitationExpiredError) return error.message;
  if (error instanceof InvitationConflictError) return error.message;
  if (error instanceof EmailMismatchError) return error.message;
  console.error("invitation decision error", error);
  return "Não foi possível processar o convite.";
}

export async function acceptInvitationAction(
  _prev: InvitationDecisionState,
  formData: FormData,
): Promise<InvitationDecisionState> {
  const user = await requireAuthenticatedUser();
  const parsed = invitationTokenSchema.safeParse({
    token: formData.get("token"),
  });
  if (!parsed.success) return { status: "error", message: "Convite inválido." };

  let result;
  try {
    result = await acceptInvitation({
      token: parsed.data.token,
      actorUserId: user.id,
      actorEmail: user.email ?? "",
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/membros");
  redirect(`/app?organizacao=${result.organizationId}`);
}

export async function declineInvitationAction(
  _prev: InvitationDecisionState,
  formData: FormData,
): Promise<InvitationDecisionState> {
  const user = await requireAuthenticatedUser();
  const parsed = invitationTokenSchema.safeParse({
    token: formData.get("token"),
  });
  if (!parsed.success) return { status: "error", message: "Convite inválido." };

  try {
    await declineInvitation({
      token: parsed.data.token,
      actorUserId: user.id,
      actorEmail: user.email ?? "",
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  return { status: "success", message: "Convite recusado." };
}
