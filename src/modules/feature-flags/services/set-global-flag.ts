import { prisma } from "@/lib/prisma";
import { canActorChangeFlag, isKnownFeatureFlag } from "@/config/feature-flags";
import {
  FeatureFlagConflictError,
  FeatureFlagForbiddenError,
  UnknownFeatureFlagError,
} from "./errors";

/**
 * Liga/desliga uma flag no escopo GLOBAL.
 *
 * Concorrência: `updateMany` condicionado ao valor esperado (OCC) — se outra
 * pessoa alterou entre a leitura e o envio, nada é gravado e o conflito é
 * auditado, seguindo o padrão de `approveRegistrationRequest` (Etapa 1.5).
 */
export async function setGlobalFeatureFlag(input: {
  key: string;
  enabled: boolean;
  expectedCurrent: boolean;
  actorId: string;
  actorIsSuperAdmin: boolean;
}) {
  // A chave nunca é confiada ao cliente: precisa existir no catálogo.
  if (!isKnownFeatureFlag(input.key)) throw new UnknownFeatureFlagError();
  if (!canActorChangeFlag(input.key, input.actorIsSuperAdmin))
    throw new FeatureFlagForbiddenError();

  try {
    return await runGlobalFlagChange(input);
  } catch (error) {
    if (error instanceof FeatureFlagConflictError) {
      const existing = await prisma.featureFlag.findFirst({
        where: { key: input.key, organizationId: null },
      });
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "feature_flag.processing_conflict",
          entityType: "feature_flag",
          entityId: existing?.id ?? null,
          metadata: { key: input.key, scope: "global" },
        },
      });
    }
    throw error;
  }
}

async function runGlobalFlagChange(input: {
  key: string;
  enabled: boolean;
  expectedCurrent: boolean;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.featureFlag.findFirst({
      where: { key: input.key, organizationId: null },
    });

    if (!existing) {
      // Flag ainda não materializada no banco: só cria se o esperado era o
      // padrão (desligada), senão houve concorrência.
      if (input.expectedCurrent !== false) throw new FeatureFlagConflictError();
      const created = await tx.featureFlag.create({
        data: {
          key: input.key,
          enabled: input.enabled,
          organizationId: null,
          updatedById: input.actorId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.enabled
            ? "feature_flag.enabled"
            : "feature_flag.disabled",
          entityType: "feature_flag",
          entityId: created.id,
          metadata: {
            key: input.key,
            scope: "global",
            previous: false,
            next: input.enabled,
          },
        },
      });
      return created;
    }

    const claimed = await tx.featureFlag.updateMany({
      where: { id: existing.id, enabled: input.expectedCurrent },
      data: { enabled: input.enabled, updatedById: input.actorId },
    });
    // O registro do conflito é gravado fora da transação (no catch abaixo),
    // senão o rollback o apagaria junto.
    if (claimed.count === 0) throw new FeatureFlagConflictError();

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.enabled
          ? "feature_flag.enabled"
          : "feature_flag.disabled",
        entityType: "feature_flag",
        entityId: existing.id,
        metadata: {
          key: input.key,
          scope: "global",
          previous: input.expectedCurrent,
          next: input.enabled,
        },
      },
    });

    return tx.featureFlag.findUniqueOrThrow({ where: { id: existing.id } });
  });
}
