import type { Metadata } from "next";
import { requireGlobalPermission, hasGlobalPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  FEATURE_FLAGS,
  canActorChangeFlag,
  getFeatureFlagDefinition,
} from "@/config/feature-flags";
import { resolveAllFeatureFlags } from "@/modules/feature-flags/services/resolve-flag";
import {
  FlagsPanel,
  type FlagRow,
} from "@/modules/feature-flags/components/flags-panel";

export const metadata: Metadata = { title: "Feature flags" };

export default async function AdminFeatureFlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const ctx = await requireGlobalPermission("feature-flags.list");
  const params = await searchParams;

  const organizations = await prisma.organization.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Só aceita uma organização que realmente exista (anti-IDOR na query string).
  const selectedOrganizationId =
    params.org && organizations.some((o) => o.id === params.org)
      ? params.org
      : null;

  const [resolved, rows] = await Promise.all([
    resolveAllFeatureFlags(selectedOrganizationId),
    prisma.featureFlag.findMany({
      where: selectedOrganizationId
        ? {
            OR: [
              { organizationId: null },
              { organizationId: selectedOrganizationId },
            ],
          }
        : { organizationId: null },
      select: {
        key: true,
        organizationId: true,
        updatedAt: true,
        updatedBy: { select: { name: true } },
      },
    }),
  ]);

  const [canUpdateOverride, canRemoveOverride] = await Promise.all([
    hasGlobalPermission("feature-flags.update-organization"),
    hasGlobalPermission("feature-flags.remove-override"),
  ]);

  const flags: FlagRow[] = resolved.map((flag) => {
    const definition =
      getFeatureFlagDefinition(flag.key) ?? FEATURE_FLAGS[flag.key];
    // A "última alteração" mostrada é a do escopo que está valendo.
    const row =
      flag.source === "organization"
        ? rows.find(
            (r) =>
              r.key === flag.key && r.organizationId === selectedOrganizationId,
          )
        : rows.find((r) => r.key === flag.key && r.organizationId === null);
    return {
      key: flag.key,
      name: definition.name,
      module: definition.module,
      description: definition.description,
      superAdminOnly: definition.superAdminOnly,
      globalEnabled: flag.globalEnabled,
      overrideEnabled: flag.overrideEnabled,
      effective: flag.effective,
      source: flag.source,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      updatedByName: row?.updatedBy?.name ?? null,
      canChange: canActorChangeFlag(flag.key, ctx.access.superAdmin),
    };
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Feature flags</h1>
      <p className="mt-1 text-sm text-muted">
        O override da organização prevalece sobre o valor global. Uma flag
        desabilitada some do menu e bloqueia o acesso direto à rota — inclusive
        para super administradores.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label htmlFor="org" className="block text-sm font-medium">
            Ver overrides da organização
          </label>
          <select
            id="org"
            name="org"
            defaultValue={selectedOrganizationId ?? ""}
            className="mt-1 rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Somente valores globais</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-muted/40 px-4 py-2 text-sm hover:bg-muted/10"
        >
          Aplicar
        </button>
      </form>

      <FlagsPanel
        flags={flags}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        canUpdateOverride={canUpdateOverride}
        canRemoveOverride={canRemoveOverride}
      />
    </>
  );
}
