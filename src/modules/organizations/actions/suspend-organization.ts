"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionForOrganization } from "@/lib/authz";
import { suspendOrganization } from "../services/suspend-organization";
import { reactivateOrganization } from "../services/reactivate-organization";
import {
  OrganizationAlreadyInStatusError,
  OrganizationConflictError,
  OrganizationNotFoundError,
} from "../services/errors";

export type OrganizationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof OrganizationConflictError) return error.message;
  if (error instanceof OrganizationNotFoundError) return error.message;
  if (error instanceof OrganizationAlreadyInStatusError) return error.message;
  console.error("organization status error", error);
  return "Não foi possível concluir a operação.";
}

export async function suspendOrganizationAction(
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const parsedId = z.uuid().safeParse(formData.get("organizationId"));
  if (!parsedId.success)
    return { status: "error", message: "Organização inválida." };

  const ctx = await requirePermissionForOrganization(
    "organizations.update",
    parsedId.data,
  );

  try {
    await suspendOrganization({
      organizationId: parsedId.data,
      actorId: ctx.user.id,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath(`/app/admin/organizacoes/${parsedId.data}`);
  revalidatePath("/app/admin/organizacoes");
  return { status: "success", message: "Organização suspensa." };
}

export async function reactivateOrganizationAction(
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const parsedId = z.uuid().safeParse(formData.get("organizationId"));
  if (!parsedId.success)
    return { status: "error", message: "Organização inválida." };

  const ctx = await requirePermissionForOrganization(
    "organizations.update",
    parsedId.data,
  );

  try {
    await reactivateOrganization({
      organizationId: parsedId.data,
      actorId: ctx.user.id,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath(`/app/admin/organizacoes/${parsedId.data}`);
  revalidatePath("/app/admin/organizacoes");
  return { status: "success", message: "Organização reativada." };
}
