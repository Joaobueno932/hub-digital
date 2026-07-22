import { requireSessionContext } from "@/lib/authz";
import { signOut } from "@/lib/auth";
import {
  buildNavigation,
  getEnabledFlags,
} from "@/modules/permissions/services/navigation";
import {
  permissionsOfMembership,
  globalPermissions,
} from "@/modules/permissions/services/authorization";
import {
  AppSidebar,
  MobileNav,
  type NavGroupData,
} from "@/components/layout/app-nav";
import { OrgSwitcher } from "@/components/layout/org-switcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSessionContext();

  const globalPermissionCodes = globalPermissions(ctx.access.memberships);
  const permissionCodes = new Set<string>([
    ...globalPermissionCodes,
    ...(ctx.activeMembership
      ? permissionsOfMembership(ctx.activeMembership)
      : []),
  ]);

  const enabledFlags = await getEnabledFlags(
    ctx.activeMembership?.organizationId ?? null,
  );

  const groups: NavGroupData[] = buildNavigation({
    isAuthenticated: true,
    superAdmin: ctx.access.superAdmin,
    permissionCodes,
    globalPermissionCodes,
    activeOrganizationType:
      ctx.activeMembership?.organization.type.code ?? null,
    hasActiveOrganization: ctx.activeMembership !== null,
    enabledFlags,
  }).map((g) => ({
    title: g.title,
    items: g.items.map((i) => ({ label: i.label, icon: i.icon, href: i.href })),
  }));

  const orgOptions = ctx.access.memberships.map((m) => ({
    id: m.organizationId,
    name: m.organization.name,
    typeName: m.organization.type.name,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar groups={groups} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-primary-dark">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <MobileNav groups={groups} />
              <OrgSwitcher
                options={orgOptions}
                activeId={ctx.activeMembership?.organizationId ?? null}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-white/85 sm:inline">
                {ctx.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-foreground-inverse hover:bg-white/10"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
