"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGlobalPermission } from "@/lib/authz";
import { setGlobalFeatureFlag } from "../services/set-global-flag";
import {
  removeOrganizationFeatureFlagOverride,
  setOrganizationFeatureFlagOverride,
} from "../services/set-organization-override";
import {
  FeatureFlagConflictError,
  FeatureFlagForbiddenError,
  FeatureFlagOverrideNotFoundError,
  OrganizationNotFoundError,
  UnknownFeatureFlagError,
} from "../services/errors";

export type FlagFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof UnknownFeatureFlagError) return error.message;
  if (error instanceof FeatureFlagForbiddenError) return error.message;
  if (error instanceof FeatureFlagConflictError) return error.message;
  if (error instanceof FeatureFlagOverrideNotFoundError) return error.message;
  if (error instanceof OrganizationNotFoundError) return error.message;
  console.error("feature flag action error", error);
  return "Não foi possível concluir a operação.";
}

/** Alterar flag muda o menu e as rotas — revalida o layout inteiro. */
function revalidateFlags() {
  revalidatePath("/app/admin/feature-flags");
  revalidatePath("/app", "layout");
}

const globalSchema = z.object({
  key: z.string().trim().min(1).max(60),
  enabled: z.enum(["true", "false"]),
  expectedCurrent: z.enum(["true", "false"]),
});

export async function setGlobalFlagAction(
  _prev: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const ctx = await requireGlobalPermission("feature-flags.update-global");

  const parsed = globalSchema.safeParse({
    key: formData.get("key"),
    enabled: formData.get("enabled"),
    expectedCurrent: formData.get("expectedCurrent"),
  });
  if (!parsed.success) return { status: "error", message: "Dados inválidos." };

  try {
    await setGlobalFeatureFlag({
      key: parsed.data.key,
      enabled: parsed.data.enabled === "true",
      expectedCurrent: parsed.data.expectedCurrent === "true",
      actorId: ctx.user.id,
      actorIsSuperAdmin: ctx.access.superAdmin,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidateFlags();
  return {
    status: "success",
    message:
      parsed.data.enabled === "true"
        ? "Módulo habilitado globalmente."
        : "Módulo desabilitado globalmente.",
  };
}

const overrideSchema = z.object({
  key: z.string().trim().min(1).max(60),
  organizationId: z.uuid(),
  enabled: z.enum(["true", "false"]),
});

export async function setOrganizationOverrideAction(
  _prev: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const ctx = await requireGlobalPermission(
    "feature-flags.update-organization",
  );

  const parsed = overrideSchema.safeParse({
    key: formData.get("key"),
    organizationId: formData.get("organizationId"),
    enabled: formData.get("enabled"),
  });
  if (!parsed.success) return { status: "error", message: "Dados inválidos." };

  try {
    await setOrganizationFeatureFlagOverride({
      key: parsed.data.key,
      organizationId: parsed.data.organizationId,
      enabled: parsed.data.enabled === "true",
      actorId: ctx.user.id,
      actorIsSuperAdmin: ctx.access.superAdmin,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidateFlags();
  return { status: "success", message: "Override da organização salvo." };
}

const removeOverrideSchema = z.object({
  key: z.string().trim().min(1).max(60),
  organizationId: z.uuid(),
});

export async function removeOrganizationOverrideAction(
  _prev: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const ctx = await requireGlobalPermission("feature-flags.remove-override");

  const parsed = removeOverrideSchema.safeParse({
    key: formData.get("key"),
    organizationId: formData.get("organizationId"),
  });
  if (!parsed.success) return { status: "error", message: "Dados inválidos." };

  try {
    await removeOrganizationFeatureFlagOverride({
      key: parsed.data.key,
      organizationId: parsed.data.organizationId,
      actorId: ctx.user.id,
      actorIsSuperAdmin: ctx.access.superAdmin,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidateFlags();
  return {
    status: "success",
    message: "Override removido — a organização volta ao valor global.",
  };
}
