import { prisma } from "@/lib/prisma";
import { resolveFeatureFlag } from "@/modules/feature-flags/services/resolve-flag";

/**
 * Serviço central de autorização (camada de dados).
 *
 * Todas as funções recebem identificadores explícitos e consultam o banco —
 * nenhuma confia em dados vindos do cliente. Os wrappers ligados à sessão
 * ficam em `src/lib/authz.ts`.
 *
 * Regras de escopo:
 * - SUPER_ADMIN (em qualquer vínculo ativo) tem acesso global.
 * - Papéis de vínculos em organização do tipo HUB têm escopo global para as
 *   permissões que possuem (ex.: ADM_HUB).
 * - Demais papéis valem somente dentro da organização do vínculo.
 */

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
export const HUB_ORG_TYPE = "HUB";

const membershipInclude = {
  organization: { include: { type: true } },
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} as const;

export type MembershipWithAccess = Awaited<
  ReturnType<typeof getUserMemberships>
>[number];

/** Vínculos válidos: membership ATIVO, não excluído, em organização ATIVA. */
export async function getUserMemberships(userId: string) {
  return prisma.membership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      deletedAt: null,
      organization: { status: "ACTIVE", deletedAt: null },
    },
    include: membershipInclude,
    orderBy: { createdAt: "asc" },
  });
}

export function permissionsOfMembership(
  membership: MembershipWithAccess,
): Set<string> {
  const codes = new Set<string>();
  for (const mr of membership.roles) {
    for (const rp of mr.role.permissions) {
      codes.add(rp.permission.code);
    }
  }
  return codes;
}

export async function getMembershipPermissions(
  membershipId: string,
): Promise<Set<string>> {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      status: "ACTIVE",
      deletedAt: null,
      organization: { status: "ACTIVE", deletedAt: null },
    },
    include: membershipInclude,
  });
  return membership ? permissionsOfMembership(membership) : new Set();
}

export function isSuperAdminMemberships(
  memberships: MembershipWithAccess[],
): boolean {
  return memberships.some((m) =>
    m.roles.some((r) => r.role.code === SUPER_ADMIN_ROLE),
  );
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  return isSuperAdminMemberships(await getUserMemberships(userId));
}

/** Permissões de escopo global do usuário (SUPER_ADMIN ou vínculos em org tipo HUB). */
export function globalPermissions(
  memberships: MembershipWithAccess[],
): Set<string> {
  const codes = new Set<string>();
  for (const m of memberships) {
    if (m.organization.type.code === HUB_ORG_TYPE) {
      for (const code of permissionsOfMembership(m)) codes.add(code);
    }
  }
  return codes;
}

export type AccessContext = {
  memberships: MembershipWithAccess[];
  superAdmin: boolean;
  global: Set<string>;
};

export async function getAccessContext(userId: string): Promise<AccessContext> {
  const memberships = await getUserMemberships(userId);
  return {
    memberships,
    superAdmin: isSuperAdminMemberships(memberships),
    global: globalPermissions(memberships),
  };
}

/**
 * Resolve a organização ativa.
 * `preferredOrganizationId` (vindo de cookie) só é aceito se corresponder a um
 * vínculo válido; caso contrário aplica-se o fallback (primeiro vínculo).
 */
export function resolveActiveMembership(
  memberships: MembershipWithAccess[],
  preferredOrganizationId?: string | null,
): MembershipWithAccess | null {
  if (preferredOrganizationId) {
    const match = memberships.find(
      (m) => m.organizationId === preferredOrganizationId,
    );
    if (match) return match;
  }
  return memberships[0] ?? null;
}

function permissionInContext(
  ctx: AccessContext,
  organizationId: string | null,
  code: string,
): boolean {
  if (ctx.superAdmin) return true;
  if (ctx.global.has(code)) return true;
  if (!organizationId) return false;
  const membership = ctx.memberships.find(
    (m) => m.organizationId === organizationId,
  );
  if (!membership) return false;
  return permissionsOfMembership(membership).has(code);
}

/**
 * Verifica uma permissão no escopo de `organizationId`.
 * `organizationId = null` só é atendido por escopo global (SUPER_ADMIN / HUB).
 */
export async function hasPermission(
  userId: string,
  organizationId: string | null,
  code: string,
): Promise<boolean> {
  const ctx = await getAccessContext(userId);
  return permissionInContext(ctx, organizationId, code);
}

export async function hasAnyPermission(
  userId: string,
  organizationId: string | null,
  codes: string[],
): Promise<boolean> {
  const ctx = await getAccessContext(userId);
  return codes.some((code) => permissionInContext(ctx, organizationId, code));
}

export async function hasAllPermissions(
  userId: string,
  organizationId: string | null,
  codes: string[],
): Promise<boolean> {
  const ctx = await getAccessContext(userId);
  return codes.every((code) => permissionInContext(ctx, organizationId, code));
}

/**
 * Feature flag avaliada no servidor.
 * Override por organização tem precedência sobre a flag global.
 *
 * Delega para o serviço central (`src/modules/feature-flags/services/resolve-flag.ts`)
 * — a regra de precedência existe em um único lugar.
 */
export async function isFeatureEnabled(
  key: string,
  organizationId?: string | null,
): Promise<boolean> {
  const resolved = await resolveFeatureFlag(key, organizationId ?? null);
  return resolved.effective;
}

/**
 * Acesso a um módulo = feature flag habilitada + (permissão exigida, se houver).
 */
export async function canAccessModule(
  userId: string,
  organizationId: string | null,
  moduleKey: string,
  requiredPermission?: string,
): Promise<boolean> {
  const enabled = await isFeatureEnabled(moduleKey, organizationId);
  if (!enabled) return false;
  if (!requiredPermission) return true;
  return hasPermission(userId, organizationId, requiredPermission);
}
