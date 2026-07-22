"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionForOrganization } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { updateMembershipRole } from "../services/update-role";
import { suspendMembership } from "../services/suspend-membership";
import { reactivateMembership } from "../services/reactivate-membership";
import { removeMembership } from "../services/remove-membership";
import {
  LastAdminError,
  MembershipConflictError,
  MembershipNotFoundError,
  RoleNotAllowedError,
  SelfElevationError,
} from "../services/errors";

export type MembershipFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

function safeErrorMessage(error: unknown): string {
  if (error instanceof LastAdminError) return error.message;
  if (error instanceof RoleNotAllowedError) return error.message;
  if (error instanceof SelfElevationError) return error.message;
  if (error instanceof MembershipConflictError) return error.message;
  if (error instanceof MembershipNotFoundError) return error.message;
  console.error("membership action error", error);
  return "Não foi possível concluir a operação.";
}

const idsSchema = z.object({
  membershipId: z.uuid(),
  organizationId: z.uuid(),
});

/**
 * Resolve o contexto autorizado para agir sobre `membershipId`, validando
 * que ele realmente pertence a `organizationId` (proteção IDOR: o form pode
 * mandar qualquer id, mas a ação só prossegue se a permissão e o vínculo
 * batem no servidor) e checando a permissão no escopo correto — organização
 * ativa (`members.manage`) ou organização arbitrária para administração
 * global.
 */
async function resolveAuthorizedMembership(formData: FormData) {
  const parsed = idsSchema.safeParse({
    membershipId: formData.get("membershipId"),
    organizationId: formData.get("organizationId"),
  });
  if (!parsed.success) return { error: "Dados inválidos." as const };

  const ctx = await requirePermissionForOrganization(
    "members.manage",
    parsed.data.organizationId,
  );

  const membership = await prisma.membership.findFirst({
    where: {
      id: parsed.data.membershipId,
      organizationId: parsed.data.organizationId,
      deletedAt: null,
    },
  });
  if (!membership) return { error: "Vínculo não encontrado." as const };

  return { ctx, membership, organizationId: parsed.data.organizationId };
}

export async function updateMembershipRoleAction(
  _prev: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const resolved = await resolveAuthorizedMembership(formData);
  if ("error" in resolved) return { status: "error", message: resolved.error };

  const newRoleCode = String(formData.get("roleCode") ?? "");
  if (!newRoleCode) return { status: "error", message: "Selecione um papel." };

  const actorMemberships = await prisma.membership.findMany({
    where: {
      userId: resolved.ctx.user.id,
      organizationId: resolved.organizationId,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: { roles: { include: { role: true } } },
  });
  const actorRoleCodesInOrg = actorMemberships.flatMap((m) =>
    m.roles.map((r) => r.role.code),
  );

  try {
    await updateMembershipRole({
      membershipId: resolved.membership.id,
      newRoleCode,
      actorId: resolved.ctx.user.id,
      actorIsSuperAdmin: resolved.ctx.access.superAdmin,
      actorRoleCodesInOrg,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/membros");
  revalidatePath(`/app/admin/organizacoes/${resolved.organizationId}/membros`);
  return { status: "success", message: "Papel atualizado." };
}

export async function suspendMembershipAction(
  _prev: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const resolved = await resolveAuthorizedMembership(formData);
  if ("error" in resolved) return { status: "error", message: resolved.error };

  try {
    await suspendMembership({
      membershipId: resolved.membership.id,
      actorId: resolved.ctx.user.id,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/membros");
  revalidatePath(`/app/admin/organizacoes/${resolved.organizationId}/membros`);
  return { status: "success", message: "Membro suspenso." };
}

export async function reactivateMembershipAction(
  _prev: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const resolved = await resolveAuthorizedMembership(formData);
  if ("error" in resolved) return { status: "error", message: resolved.error };

  try {
    await reactivateMembership({
      membershipId: resolved.membership.id,
      actorId: resolved.ctx.user.id,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/membros");
  revalidatePath(`/app/admin/organizacoes/${resolved.organizationId}/membros`);
  return { status: "success", message: "Membro reativado." };
}

export async function removeMembershipAction(
  _prev: MembershipFormState,
  formData: FormData,
): Promise<MembershipFormState> {
  const resolved = await resolveAuthorizedMembership(formData);
  if ("error" in resolved) return { status: "error", message: resolved.error };

  try {
    await removeMembership({
      membershipId: resolved.membership.id,
      actorId: resolved.ctx.user.id,
    });
  } catch (error) {
    return { status: "error", message: safeErrorMessage(error) };
  }

  revalidatePath("/app/membros");
  revalidatePath(`/app/admin/organizacoes/${resolved.organizationId}/membros`);
  return { status: "success", message: "Membro removido." };
}
