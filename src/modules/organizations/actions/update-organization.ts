"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  requirePermission,
  requirePermissionForOrganization,
} from "@/lib/authz";
import { updateOrganizationSchema } from "../schemas/update";
import { updateOrganization } from "../services/update-organization";
import {
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
  console.error("organization update error", error);
  return "Não foi possível salvar as alterações. Tente novamente.";
}

/**
 * Edição da própria organização (AE/AS) — permissão `organizations.update.own`,
 * restrita à organização ativa do ator (proteção IDOR: nunca confia no
 * `organizationId` do formulário além de validar que bate com o vínculo ativo).
 */
export async function updateOwnOrganizationAction(
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const ctx = await requirePermission("organizations.update.own");
  if (!ctx.activeMembership)
    return { status: "error", message: "Nenhuma organização ativa." };

  return runUpdate(
    ctx.activeMembership.organizationId,
    ctx.user.id,
    formData,
    "/app/minha-organizacao",
  );
}

/**
 * Edição administrativa de organização arbitrária (AH/SA) —
 * `organizations.update` no escopo da organização informada.
 */
export async function updateAnyOrganizationAction(
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  const orgIdRaw = formData.get("organizationId");
  const parsedId = z.uuid().safeParse(orgIdRaw);
  if (!parsedId.success)
    return { status: "error", message: "Organização inválida." };

  const ctx = await requirePermissionForOrganization(
    "organizations.update",
    parsedId.data,
  );

  return runUpdate(
    parsedId.data,
    ctx.user.id,
    formData,
    `/app/admin/organizacoes/${parsedId.data}`,
  );
}

async function runUpdate(
  organizationId: string,
  actorId: string,
  formData: FormData,
  revalidate: string,
): Promise<OrganizationFormState> {
  const parsed = updateOrganizationSchema.safeParse({
    organizationId,
    name: formData.get("name"),
    displayName: formData.get("displayName"),
    description: formData.get("description"),
    website: formData.get("website"),
    city: formData.get("city"),
    state: formData.get("state"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  try {
    await updateOrganization({
      organizationId,
      actorId,
      data: {
        name: parsed.data.name,
        displayName: parsed.data.displayName,
        description: parsed.data.description,
        website: parsed.data.website,
        city: parsed.data.city,
        state: parsed.data.state,
      },
      expectedUpdatedAt: new Date(parsed.data.expectedUpdatedAt),
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath(revalidate);
  return { status: "success", message: "Organização atualizada com sucesso." };
}
