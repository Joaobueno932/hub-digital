"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz";
import { approveInputSchema, rejectInputSchema } from "../schemas/decision";
import { approveRegistrationRequest } from "../services/approve-registration";
import { rejectRegistrationRequest } from "../services/reject-registration";
import {
  InvalidPayloadError,
  RegistrationConflictError,
  RegistrationNotFoundError,
  SelfReviewError,
} from "../services/errors";

export type DecisionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof RegistrationConflictError)
    return "Esta solicitação já foi processada por outra pessoa.";
  if (error instanceof SelfReviewError)
    return "Você não pode analisar a sua própria solicitação.";
  if (error instanceof InvalidPayloadError)
    return "Os dados da solicitação são inválidos e não podem ser aprovados automaticamente.";
  if (error instanceof RegistrationNotFoundError)
    return "Solicitação não encontrada.";
  // Erro inesperado: mensagem genérica, sem stack trace.
  console.error("registration decision error", error);
  return "Não foi possível concluir a operação. Tente novamente.";
}

export async function approveRegistrationAction(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const ctx = await requirePermission("registrations.approve");

  const parsed = approveInputSchema.safeParse({
    requestId: formData.get("requestId"),
  });
  if (!parsed.success)
    return { status: "error", message: "Identificador inválido." };

  try {
    await approveRegistrationRequest({
      requestId: parsed.data.requestId,
      actorId: ctx.user.id,
      actorOrganizationId: ctx.activeMembership?.organizationId ?? null,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/admin/cadastros");
  revalidatePath(`/app/admin/cadastros/${parsed.data.requestId}`);
  return { status: "success", message: "Solicitação aprovada com sucesso." };
}

export async function rejectRegistrationAction(
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const ctx = await requirePermission("registrations.reject");

  const parsed = rejectInputSchema.safeParse({
    requestId: formData.get("requestId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await rejectRegistrationRequest({
      requestId: parsed.data.requestId,
      actorId: ctx.user.id,
      actorOrganizationId: ctx.activeMembership?.organizationId ?? null,
      reason: parsed.data.reason,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/admin/cadastros");
  revalidatePath(`/app/admin/cadastros/${parsed.data.requestId}`);
  return { status: "success", message: "Solicitação reprovada." };
}
