/**
 * Testes de integração das feature flags (PostgreSQL real).
 *
 * Toda alteração de flag GLOBAL é restaurada ao final — a suíte compartilha o
 * banco e o Playwright roda com workers: 1, então um valor global vazado
 * contaminaria os demais testes.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resolveFeatureFlag,
  resolveAllFeatureFlags,
  getEffectiveEnabledFlags,
} from "../services/resolve-flag";
import { setGlobalFeatureFlag } from "../services/set-global-flag";
import {
  setOrganizationFeatureFlagOverride,
  removeOrganizationFeatureFlagOverride,
} from "../services/set-organization-override";
import {
  FeatureFlagConflictError,
  FeatureFlagForbiddenError,
  FeatureFlagOverrideNotFoundError,
  OrganizationNotFoundError,
  UnknownFeatureFlagError,
} from "../services/errors";

/**
 * `ideation` é usada só por este arquivo — `authorization.int.test.ts` usa
 * `coworking`, e o Vitest roda arquivos em paralelo. As organizações também
 * são fixtures próprias, para que nenhum override colida com outro teste.
 */
const FLAG = "ideation";
let superadminId: string;
let orgId: string;
let otherOrgId: string;
let originalGlobal: boolean;
const createdOrgIds: string[] = [];

beforeAll(async () => {
  superadminId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "superadmin@dev.hubdigital.local" },
    })
  ).id;

  const startupType = await prisma.organizationType.findUniqueOrThrow({
    where: { code: "STARTUP" },
  });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const org = await prisma.organization.create({
    data: {
      name: `Org Flags ${suffix}`,
      slug: `org-flags-${suffix}`,
      typeId: startupType.id,
      status: "ACTIVE",
    },
  });
  const other = await prisma.organization.create({
    data: {
      name: `Org Flags Outra ${suffix}`,
      slug: `org-flags-outra-${suffix}`,
      typeId: startupType.id,
      status: "ACTIVE",
    },
  });
  orgId = org.id;
  otherOrgId = other.id;
  createdOrgIds.push(org.id, other.id);

  originalGlobal =
    (
      await prisma.featureFlag.findFirst({
        where: { key: FLAG, organizationId: null },
      })
    )?.enabled ?? false;
});

afterEach(async () => {
  // Restaura o estado global e limpa overrides criados pelos testes.
  await prisma.featureFlag.updateMany({
    where: { key: FLAG, organizationId: null },
    data: { enabled: originalGlobal },
  });
  await prisma.featureFlag.deleteMany({
    where: { key: FLAG, organizationId: { in: [orgId, otherOrgId] } },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.featureFlag.deleteMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: createdOrgIds } },
  });
  // Restaura o valor global desta flag para o estado anterior à suíte.
  await prisma.featureFlag.updateMany({
    where: { key: FLAG, organizationId: null },
    data: { enabled: originalGlobal },
  });
  await prisma.$disconnect();
});

describe("precedência do valor efetivo", () => {
  it("sem override, vale o valor global", async () => {
    await setGlobalFeatureFlag({
      key: FLAG,
      enabled: true,
      expectedCurrent: originalGlobal,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    const resolved = await resolveFeatureFlag(FLAG, orgId);
    expect(resolved.globalEnabled).toBe(true);
    expect(resolved.overrideEnabled).toBeNull();
    expect(resolved.effective).toBe(true);
    expect(resolved.source).toBe("global");
  });

  it("override desligado vence global ligada", async () => {
    await setGlobalFeatureFlag({
      key: FLAG,
      enabled: true,
      expectedCurrent: originalGlobal,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: false,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });

    const resolved = await resolveFeatureFlag(FLAG, orgId);
    expect(resolved.effective).toBe(false);
    expect(resolved.source).toBe("organization");

    // Outra organização continua seguindo o global.
    expect((await resolveFeatureFlag(FLAG, otherOrgId)).effective).toBe(true);
  });

  it("override ligado vence global desligada", async () => {
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: true,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    const resolved = await resolveFeatureFlag(FLAG, orgId);
    expect(resolved.globalEnabled).toBe(false);
    expect(resolved.effective).toBe(true);
    expect(resolved.source).toBe("organization");
  });

  it("remover o override devolve o valor global", async () => {
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: true,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    expect((await resolveFeatureFlag(FLAG, orgId)).effective).toBe(true);

    await removeOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });

    const resolved = await resolveFeatureFlag(FLAG, orgId);
    expect(resolved.overrideEnabled).toBeNull();
    expect(resolved.effective).toBe(false);
    expect(resolved.source).toBe("global");
  });

  it("remover override inexistente falha", async () => {
    await expect(
      removeOrganizationFeatureFlagOverride({
        key: FLAG,
        organizationId: orgId,
        actorId: superadminId,
        actorIsSuperAdmin: true,
      }),
    ).rejects.toBeInstanceOf(FeatureFlagOverrideNotFoundError);
  });

  it("chave desconhecida nunca habilita nada", async () => {
    const resolved = await resolveFeatureFlag("nao-existe", orgId);
    expect(resolved.effective).toBe(false);
  });

  it("resolveAllFeatureFlags cobre o catálogo inteiro", async () => {
    const all = await resolveAllFeatureFlags(orgId);
    expect(all).toHaveLength(13);
  });

  it("getEffectiveEnabledFlags reflete o override", async () => {
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: true,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    expect(await getEffectiveEnabledFlags(orgId)).toContain(FLAG);
    expect(await getEffectiveEnabledFlags(otherOrgId)).not.toContain(FLAG);
  });
});

describe("autorização e validação", () => {
  it("rejeita chave fora do catálogo", async () => {
    await expect(
      setGlobalFeatureFlag({
        key: "flag-inventada",
        enabled: true,
        expectedCurrent: false,
        actorId: superadminId,
        actorIsSuperAdmin: true,
      }),
    ).rejects.toBeInstanceOf(UnknownFeatureFlagError);
  });

  it("ADM_HUB não altera payments nem external-integrations", async () => {
    for (const key of ["payments", "external-integrations"]) {
      await expect(
        setGlobalFeatureFlag({
          key,
          enabled: true,
          expectedCurrent: false,
          actorId: superadminId,
          actorIsSuperAdmin: false,
        }),
      ).rejects.toBeInstanceOf(FeatureFlagForbiddenError);
      await expect(
        setOrganizationFeatureFlagOverride({
          key,
          organizationId: orgId,
          enabled: true,
          actorId: superadminId,
          actorIsSuperAdmin: false,
        }),
      ).rejects.toBeInstanceOf(FeatureFlagForbiddenError);
    }
  });

  it("rejeita override para organização inexistente", async () => {
    await expect(
      setOrganizationFeatureFlagOverride({
        key: FLAG,
        organizationId: "00000000-0000-4000-8000-000000000000",
        enabled: true,
        actorId: superadminId,
        actorIsSuperAdmin: true,
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it("alteração global concorrente: apenas uma processa", async () => {
    const results = await Promise.allSettled([
      setGlobalFeatureFlag({
        key: FLAG,
        enabled: true,
        expectedCurrent: originalGlobal,
        actorId: superadminId,
        actorIsSuperAdmin: true,
      }),
      setGlobalFeatureFlag({
        key: FLAG,
        enabled: true,
        expectedCurrent: originalGlobal,
        actorId: superadminId,
        actorIsSuperAdmin: true,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(FeatureFlagConflictError);
    }
  });

  it("override duplicado não é criado (upsert sobre unique)", async () => {
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: true,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: false,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    const count = await prisma.featureFlag.count({
      where: { key: FLAG, organizationId: orgId },
    });
    expect(count).toBe(1);
  });
});

describe("auditoria", () => {
  it("registra habilitação, override e remoção", async () => {
    await setGlobalFeatureFlag({
      key: FLAG,
      enabled: true,
      expectedCurrent: originalGlobal,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    await setOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      enabled: false,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });
    await removeOrganizationFeatureFlagOverride({
      key: FLAG,
      organizationId: orgId,
      actorId: superadminId,
      actorIsSuperAdmin: true,
    });

    const actions = (
      await prisma.auditLog.findMany({
        where: {
          entityType: "feature_flag",
          OR: [
            { organizationId: { in: createdOrgIds } },
            { actorId: superadminId },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: { action: true },
      })
    ).map((a) => a.action);

    expect(actions).toContain("feature_flag.enabled");
    expect(actions).toContain("feature_flag.organization_override_created");
    expect(actions).toContain("feature_flag.organization_override_removed");
  });
});
