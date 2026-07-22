import { NAV_ITEMS, type NavItem } from "@/config/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Filtro do menu — função pura (testável) + carregador de flags.
 * A visibilidade do menu é conveniência de UI; a autorização real acontece
 * nas páginas e actions.
 */

export type NavContext = {
  isAuthenticated: boolean;
  superAdmin: boolean;
  permissionCodes: Set<string>;
  /**
   * Permissões de escopo global (SUPER_ADMIN ou vínculo em organização HUB).
   * Subconjunto de `permissionCodes`, usado pelos itens `requiresGlobalScope`
   * para que o menu reflita exatamente `requireGlobalPermission`.
   */
  globalPermissionCodes: Set<string>;
  activeOrganizationType: string | null; // código do OrganizationType
  hasActiveOrganization: boolean;
  enabledFlags: Set<string>;
};

export function filterNavigation(items: NavItem[], ctx: NavContext): NavItem[] {
  if (!ctx.isAuthenticated) return [];
  return items.filter((item) => {
    if (
      item.requiresOrganization &&
      !ctx.hasActiveOrganization &&
      !ctx.superAdmin
    )
      return false;
    if (item.featureFlag && !ctx.enabledFlags.has(item.featureFlag))
      return false;
    if (
      item.organizationTypes &&
      !ctx.superAdmin &&
      (!ctx.activeOrganizationType ||
        !item.organizationTypes.includes(ctx.activeOrganizationType))
    ) {
      return false;
    }
    if (
      item.anyPermission &&
      item.anyPermission.length > 0 &&
      !ctx.superAdmin
    ) {
      // Itens de escopo global só aceitam permissões globais; ter a permissão
      // dentro da própria organização não revela a administração da plataforma.
      const pool = item.requiresGlobalScope
        ? ctx.globalPermissionCodes
        : ctx.permissionCodes;
      if (!item.anyPermission.some((code) => pool.has(code))) return false;
    }
    return true;
  });
}

/** Flags habilitadas para a organização (override por organização vence a global). */
export async function getEnabledFlags(
  organizationId: string | null,
): Promise<Set<string>> {
  const flags = await prisma.featureFlag.findMany({
    where: organizationId
      ? { OR: [{ organizationId: null }, { organizationId }] }
      : { organizationId: null },
  });
  const byKey = new Map<string, boolean>();
  for (const flag of flags) {
    if (flag.organizationId === null && !byKey.has(flag.key))
      byKey.set(flag.key, flag.enabled);
  }
  for (const flag of flags) {
    if (flag.organizationId !== null) byKey.set(flag.key, flag.enabled);
  }
  return new Set(
    [...byKey.entries()].filter(([, enabled]) => enabled).map(([key]) => key),
  );
}

export function buildNavigation(ctx: NavContext) {
  const visible = filterNavigation(NAV_ITEMS, ctx);
  const groups: Array<{
    group: NavItem["group"];
    title: string;
    items: NavItem[];
  }> = [
    { group: "geral", title: "Geral", items: [] },
    { group: "modulos", title: "Módulos", items: [] },
    { group: "administracao", title: "Administração", items: [] },
    { group: "conta", title: "Conta", items: [] },
  ];
  for (const item of visible) {
    groups.find((g) => g.group === item.group)?.items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}
