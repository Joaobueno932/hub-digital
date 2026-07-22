import { prisma } from "@/lib/prisma";
import { UserConflictError, UserNotFoundError } from "./errors";
import { assertCanAdministerTarget } from "./super-admin-guards";

/** Reativa uma conta suspensa, limpando os campos de suspensão. */
export async function reactivateUser(input: {
  userId: string;
  actorId: string;
  actorIsSuperAdmin: boolean;
}) {
  const user = await prisma.user.findFirst({
    where: { id: input.userId, deletedAt: null },
  });
  if (!user) throw new UserNotFoundError();

  await assertCanAdministerTarget(prisma, user.id, input.actorIsSuperAdmin);

  try {
    return await prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: user.id, status: "SUSPENDED" },
        data: {
          status: "ACTIVE",
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
        },
      });
      if (claimed.count === 0) throw new UserConflictError();

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.reactivated",
          entityType: "user",
          entityId: user.id,
          metadata: {
            previousStatus: "SUSPENDED",
            newStatus: "ACTIVE",
            previousReason: user.suspensionReason,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "user.reactivated",
          title: "Sua conta foi reativada",
          body: "Você já pode acessar a plataforma normalmente.",
          link: "/app",
        },
      });

      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
  } catch (error) {
    // O registro do conflito precisa sobreviver ao rollback da transação.
    if (error instanceof UserConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.processing_conflict",
          entityType: "user",
          entityId: user.id,
          metadata: { attempted: "reactivate" },
        },
      });
    }
    throw error;
  }
}
