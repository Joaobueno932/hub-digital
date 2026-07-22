import { prisma } from "@/lib/prisma";
import { canActorChangeFlag, isKnownFeatureFlag } from "@/config/feature-flags";
import {
  FeatureFlagForbiddenError,
  FeatureFlagOverrideNotFoundError,
  OrganizationNotFoundError,
  UnknownFeatureFlagError,
} from "./errors";

async function assertFlagAndOrganization(
  key: string,
  organizationId: string,
  actorIsSuperAdmin: boolean,
) {
  if (!isKnownFeatureFlag(key)) throw new UnknownFeatureFlagError();
  if (!canActorChangeFlag(key, actorIsSuperAdmin))
    throw new FeatureFlagForbiddenError();

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
  });
  if (!organization) throw new OrganizationNotFoundError();
  return organization;
}

/**
 * Cria ou atualiza o override de uma flag para uma organização.
 *
 * A duplicidade é impedida pelo `@@unique([key, organizationId])` do schema —
 * o `upsert` abaixo se apoia nele, então duas requisições simultâneas não
 * criam dois overrides.
 */
export async function setOrganizationFeatureFlagOverride(input: {
  key: string;
  organizationId: string;
  enabled: boolean;
  actorId: string;
  actorIsSuperAdmin: boolean;
}) {
  await assertFlagAndOrganization(
    input.key,
    input.organizationId,
    input.actorIsSuperAdmin,
  );

  return prisma.$transaction(async (tx) => {
    const previous = await tx.featureFlag.findFirst({
      where: { key: input.key, organizationId: input.organizationId },
    });

    const override = await tx.featureFlag.upsert({
      where: {
        key_organizationId: {
          key: input.key,
          organizationId: input.organizationId,
        },
      },
      update: { enabled: input.enabled, updatedById: input.actorId },
      create: {
        key: input.key,
        organizationId: input.organizationId,
        enabled: input.enabled,
        updatedById: input.actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: previous
          ? "feature_flag.organization_override_updated"
          : "feature_flag.organization_override_created",
        entityType: "feature_flag",
        entityId: override.id,
        metadata: {
          key: input.key,
          scope: "organization",
          previous: previous ? previous.enabled : null,
          next: input.enabled,
        },
      },
    });

    return override;
  });
}

/** Remove o override — a organização volta a seguir o valor global. */
export async function removeOrganizationFeatureFlagOverride(input: {
  key: string;
  organizationId: string;
  actorId: string;
  actorIsSuperAdmin: boolean;
}) {
  await assertFlagAndOrganization(
    input.key,
    input.organizationId,
    input.actorIsSuperAdmin,
  );

  return prisma.$transaction(async (tx) => {
    const existing = await tx.featureFlag.findFirst({
      where: { key: input.key, organizationId: input.organizationId },
    });
    if (!existing) throw new FeatureFlagOverrideNotFoundError();

    // Override é configuração, não histórico: pode ser apagado. O rastro fica
    // no AuditLog.
    const deleted = await tx.featureFlag.deleteMany({
      where: { id: existing.id },
    });
    if (deleted.count === 0) throw new FeatureFlagOverrideNotFoundError();

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: "feature_flag.organization_override_removed",
        entityType: "feature_flag",
        entityId: existing.id,
        metadata: {
          key: input.key,
          scope: "organization",
          previous: existing.enabled,
          next: null,
        },
      },
    });
  });
}
