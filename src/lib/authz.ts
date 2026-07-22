import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAccessContext,
  resolveActiveMembership,
  hasPermission as hasPermissionForOrganization,
  type AccessContext,
  type MembershipWithAccess,
} from "@/modules/permissions/services/authorization";

/**
 * Wrappers de autorização ligados à sessão (request-scoped).
 *
 * O cookie de organização ativa guarda apenas uma *preferência*: o valor é
 * revalidado contra os vínculos do usuário a cada request e nunca autoriza
 * nada por si só. Ver docs/decisoes-tecnicas.md.
 */

export const ACTIVE_ORG_COOKIE = "hub.active-org";

export type SessionContext = {
  user: { id: string; name: string | null; email: string | null };
  access: AccessContext;
  activeMembership: MembershipWithAccess | null;
};

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, status: "ACTIVE", deletedAt: null },
  });
  return user;
});

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const access = await getAccessContext(user.id);
    const cookieStore = await cookies();
    const preferred = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
    const activeMembership = resolveActiveMembership(
      access.memberships,
      preferred,
    );

    return {
      user: { id: user.id, name: user.name, email: user.email },
      access,
      activeMembership,
    };
  },
);

export async function requireSessionContext(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function getActiveOrganization() {
  const ctx = await getSessionContext();
  return ctx?.activeMembership?.organization ?? null;
}

export async function requireActiveOrganization() {
  const ctx = await requireSessionContext();
  if (!ctx.activeMembership) redirect("/app/sem-organizacao");
  return ctx.activeMembership.organization;
}

function permissionInContext(ctx: SessionContext, code: string): boolean {
  if (ctx.access.superAdmin) return true;
  if (ctx.access.global.has(code)) return true;
  const membership = ctx.activeMembership;
  if (!membership) return false;
  return membership.roles.some((mr) =>
    mr.role.permissions.some((rp) => rp.permission.code === code),
  );
}

export async function hasPermission(code: string): Promise<boolean> {
  const ctx = await getSessionContext();
  if (!ctx) return false;
  return permissionInContext(ctx, code);
}

export async function hasAnyPermission(codes: string[]): Promise<boolean> {
  const ctx = await getSessionContext();
  if (!ctx) return false;
  return codes.some((code) => permissionInContext(ctx, code));
}

export async function hasAllPermissions(codes: string[]): Promise<boolean> {
  const ctx = await getSessionContext();
  if (!ctx) return false;
  return codes.every((code) => permissionInContext(ctx, code));
}

/**
 * Exige a permissão no escopo da organização ativa (ou escopo global).
 * Redireciona para acesso negado sem revelar dados da entidade.
 */
export async function requirePermission(code: string): Promise<SessionContext> {
  const ctx = await requireSessionContext();
  if (!permissionInContext(ctx, code)) redirect("/app/acesso-negado");
  return ctx;
}

export async function requireAnyPermission(
  codes: string[],
): Promise<SessionContext> {
  const ctx = await requireSessionContext();
  if (!codes.some((code) => permissionInContext(ctx, code)))
    redirect("/app/acesso-negado");
  return ctx;
}

/**
 * Exige a permissão no escopo de uma organização arbitrária (não
 * necessariamente a organização ativa) — usada pelas telas de
 * administração global (`/app/admin/organizacoes/[organizationId]`).
 * SUPER_ADMIN e permissões de escopo global (ex.: ADM_HUB) continuam
 * bastando; caso contrário, o ator precisa de um vínculo ativo real na
 * organização alvo com a permissão.
 */
export async function requirePermissionForOrganization(
  code: string,
  organizationId: string,
): Promise<SessionContext> {
  const ctx = await requireSessionContext();
  const authorized =
    ctx.access.superAdmin ||
    ctx.access.global.has(code) ||
    (await hasPermissionForOrganization(ctx.user.id, organizationId, code));
  if (!authorized) redirect("/app/acesso-negado");
  return ctx;
}
