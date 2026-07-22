import { prisma } from "@/lib/prisma";
import { FEATURE_FLAG_KEYS, isKnownFeatureFlag } from "@/config/feature-flags";

/**
 * Avaliação centralizada das feature flags.
 *
 * Precedência: **override da organização vence o valor global**; sem override,
 * vale o global; flag inexistente no banco conta como desligada. Esta é a
 * única implementação dessa regra — `isFeatureEnabled` (autorização) e
 * `getEnabledFlags` (menu) delegam para cá, para não divergirem.
 */

export type FlagSource = "global" | "organization";

export type ResolvedFlag = {
  key: string;
  globalEnabled: boolean;
  /** `null` quando a organização não tem override. */
  overrideEnabled: boolean | null;
  effective: boolean;
  source: FlagSource;
};

function resolve(
  key: string,
  globalEnabled: boolean,
  overrideEnabled: boolean | null,
): ResolvedFlag {
  const hasOverride = overrideEnabled !== null;
  return {
    key,
    globalEnabled,
    overrideEnabled,
    effective: hasOverride ? overrideEnabled : globalEnabled,
    source: hasOverride ? "organization" : "global",
  };
}

/** Valor efetivo de uma flag para uma organização (ou global, se `null`). */
export async function resolveFeatureFlag(
  key: string,
  organizationId: string | null,
): Promise<ResolvedFlag> {
  // Chave fora do catálogo nunca habilita nada, mesmo que exista uma linha
  // órfã no banco.
  if (!isKnownFeatureFlag(key)) return resolve(key, false, null);

  const rows = await prisma.featureFlag.findMany({
    where: organizationId
      ? { key, OR: [{ organizationId: null }, { organizationId }] }
      : { key, organizationId: null },
  });

  const globalEnabled =
    rows.find((r) => r.organizationId === null)?.enabled ?? false;
  const override = organizationId
    ? rows.find((r) => r.organizationId === organizationId)
    : undefined;

  return resolve(key, globalEnabled, override ? override.enabled : null);
}

/** Resolve todas as flags do catálogo de uma vez (uma query só). */
export async function resolveAllFeatureFlags(
  organizationId: string | null,
): Promise<ResolvedFlag[]> {
  const rows = await prisma.featureFlag.findMany({
    where: organizationId
      ? { OR: [{ organizationId: null }, { organizationId }] }
      : { organizationId: null },
  });

  return FEATURE_FLAG_KEYS.map((key) => {
    const globalEnabled =
      rows.find((r) => r.key === key && r.organizationId === null)?.enabled ??
      false;
    const override = organizationId
      ? rows.find((r) => r.key === key && r.organizationId === organizationId)
      : undefined;
    return resolve(key, globalEnabled, override ? override.enabled : null);
  });
}

/** Conjunto das flags efetivamente habilitadas (usado pelo menu). */
export async function getEffectiveEnabledFlags(
  organizationId: string | null,
): Promise<Set<string>> {
  const resolved = await resolveAllFeatureFlags(organizationId);
  return new Set(resolved.filter((f) => f.effective).map((f) => f.key));
}
