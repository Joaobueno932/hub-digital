import { prisma } from "@/lib/prisma";
import { UserConflictError, UserNotFoundError } from "./errors";
import { assertCanAdministerTarget } from "./super-admin-guards";

/**
 * Edita os dados administrativos permitidos do usuário (hoje apenas o nome).
 * Concorrência por OCC via `updatedAt`, como em `updateOrganization`.
 */
export async function updateUser(input: {
  userId: string;
  actorId: string;
  actorIsSuperAdmin: boolean;
  name: string;
  expectedUpdatedAt: Date;
}) {
  const before = await prisma.user.findFirst({
    where: { id: input.userId, deletedAt: null },
  });
  if (!before) throw new UserNotFoundError();

  await assertCanAdministerTarget(prisma, before.id, input.actorIsSuperAdmin);

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: before.id, updatedAt: input.expectedUpdatedAt },
        data: { name: input.name },
      });
      if (claimed.count === 0) throw new UserConflictError();

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.updated",
          entityType: "user",
          entityId: before.id,
          metadata: {
            before: { name: before.name },
            after: { name: input.name },
          },
        },
      });

      return tx.user.findUniqueOrThrow({ where: { id: before.id } });
    });
  } catch (error) {
    // O registro do conflito precisa sobreviver ao rollback da transação.
    if (error instanceof UserConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.processing_conflict",
          entityType: "user",
          entityId: before.id,
          metadata: { attempted: "update" },
        },
      });
    }
    throw error;
  }
}
