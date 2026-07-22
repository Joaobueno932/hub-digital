import { prisma } from "@/lib/prisma";
import { OrganizationConflictError, OrganizationNotFoundError } from "./errors";

export type UpdateOrganizationFields = {
  name: string;
  displayName: string | null;
  description: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
};

/**
 * Edita os dados institucionais de uma organização.
 *
 * Concorrência: `updateMany` condicionado a `updatedAt === expectedUpdatedAt`
 * implementa controle otimista — se outra pessoa editou a organização entre
 * a leitura e o envio do formulário, `count === 0` e nada é gravado.
 */
export async function updateOrganization(input: {
  organizationId: string;
  actorId: string;
  data: UpdateOrganizationFields;
  expectedUpdatedAt: Date;
}) {
  const before = await prisma.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
  });
  if (!before) throw new OrganizationNotFoundError();

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.organization.updateMany({
        where: { id: input.organizationId, updatedAt: input.expectedUpdatedAt },
        data: input.data,
      });
      // Conflito de OCC: auditado no catch (fora da transação revertida).
      if (claimed.count === 0) throw new OrganizationConflictError();

      const after = await tx.organization.findUniqueOrThrow({
        where: { id: input.organizationId },
      });

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: input.organizationId,
          action: "organization.updated",
          entityType: "organization",
          entityId: input.organizationId,
          metadata: {
            before: {
              name: before.name,
              displayName: before.displayName,
              description: before.description,
              website: before.website,
              city: before.city,
              state: before.state,
            },
            after: input.data,
          },
        },
      });

      return after;
    });
  } catch (error) {
    if (error instanceof OrganizationConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: input.organizationId,
          action: "organization.processing_conflict",
          entityType: "organization",
          entityId: input.organizationId,
          metadata: { attempted: "update" },
        },
      });
    }
    throw error;
  }
}
