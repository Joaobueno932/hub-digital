"use server";

import { revalidatePath } from "next/cache";
import { requireGlobalPermission } from "@/lib/authz";
import {
  reactivateUserSchema,
  suspendUserSchema,
  updateUserSchema,
} from "../schemas/update";
import { updateUser } from "../services/update-user";
import { suspendUser } from "../services/suspend-user";
import { reactivateUser } from "../services/reactivate-user";
import {
  LastSuperAdminError,
  SelfSuspensionError,
  SuperAdminProtectedError,
  UserConflictError,
  UserNotFoundError,
} from "../services/errors";

export type UserFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof LastSuperAdminError) return error.message;
  if (error instanceof SelfSuspensionError) return error.message;
  if (error instanceof SuperAdminProtectedError) return error.message;
  if (error instanceof UserConflictError) return error.message;
  if (error instanceof UserNotFoundError) return error.message;
  console.error("user admin action error", error);
  return "Não foi possível concluir a operação.";
}

function revalidateUser(userId: string) {
  revalidatePath("/app/admin/usuarios");
  revalidatePath(`/app/admin/usuarios/${userId}`);
}

export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const ctx = await requireGlobalPermission("users.update");

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await updateUser({
      userId: parsed.data.userId,
      actorId: ctx.user.id,
      actorIsSuperAdmin: ctx.access.superAdmin,
      name: parsed.data.name,
      expectedUpdatedAt: new Date(parsed.data.expectedUpdatedAt),
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidateUser(parsed.data.userId);
  return { status: "success", message: "Usuário atualizado." };
}

export async function suspendUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const ctx = await requireGlobalPermission("users.suspend");

  const parsed = suspendUserSchema.safeParse({
    userId: formData.get("userId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Informe um motivo com pelo menos 10 caracteres.",
    };
  }

  try {
    await suspendUser({
      userId: parsed.data.userId,
      actorId: ctx.user.id,
      actorIsSuperAdmin: ctx.access.superAdmin,
      reason: parsed.data.reason,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidateUser(parsed.data.userId);
  return { status: "success", message: "Usuário suspenso." };
}

export async function reactivateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const ctx = await requireGlobalPermission("users.reactivate");

  const parsed = reactivateUserSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { status: "error", message: "Usuário inválido." };

  try {
    await reactivateUser({
      userId: parsed.data.userId,
      actorId: ctx.user.id,
      actorIsSuperAdmin: ctx.access.superAdmin,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidateUser(parsed.data.userId);
  return { status: "success", message: "Usuário reativado." };
}
