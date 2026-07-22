import { prisma } from "@/lib/prisma";
import {
  LastSuperAdminError,
  SelfSuspensionError,
  UserConflictError,
  UserNotFoundError,
} from "./errors";
import {
  assertCanAdministerTarget,
  assertNotLastActiveSuperAdmin,
  isUserSuperAdmin,
} from "./super-admin-guards";

/**
 * Suspende uma conta.
 *
 * O acesso é cortado por dois caminhos já existentes: `authorize`
 * (`src/lib/auth.ts`) recusa login de quem não está ACTIVE, e `getCurrentUser`
 * (`src/lib/authz.ts`) refaz a checagem a cada request, então a sessão JWT
 * viva perde acesso no request seguinte. JWT não é revogável no servidor — a
 * revalidação por request é o mecanismo real.
 *
 * Nada é apagado: vínculos, solicitações, onboarding, auditoria e notificações
 * permanecem intactos.
 */
export async function suspendUser(input: {
  userId: string;
  actorId: string;
  actorIsSuperAdmin: boolean;
  reason: string;
}) {
  if (input.userId === input.actorId) {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: "user.self_suspension_blocked",
        entityType: "user",
        entityId: input.userId,
        metadata: {},
      },
    });
    throw new SelfSuspensionError();
  }

  const user = await prisma.user.findFirst({
    where: { id: input.userId, deletedAt: null },
  });
  if (!user) throw new UserNotFoundError();

  await assertCanAdministerTarget(prisma, user.id, input.actorIsSuperAdmin);

  try {
    return await prisma.$transaction(async (tx) => {
      // A guarda fica DENTRO da transação para ser atômica com a escrita —
      // o registro do bloqueio é gravado fora, no catch, porque tudo que é
      // escrito aqui some no rollback.
      if (await isUserSuperAdmin(tx, user.id)) {
        await assertNotLastActiveSuperAdmin(tx, user.id);
      }

      const claimed = await tx.user.updateMany({
        where: { id: user.id, status: "ACTIVE" },
        data: {
          status: "SUSPENDED",
          suspendedAt: new Date(),
          suspendedById: input.actorId,
          suspensionReason: input.reason,
        },
      });
      if (claimed.count === 0) throw new UserConflictError();

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.suspended",
          entityType: "user",
          entityId: user.id,
          metadata: {
            previousStatus: "ACTIVE",
            newStatus: "SUSPENDED",
            reason: input.reason,
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "user.suspended",
          title: "Sua conta foi suspensa",
          body: `Motivo: ${input.reason}`,
        },
      });

      return tx.user.findUniqueOrThrow({ where: { id: user.id } });
    });
  } catch (error) {
    // Auditoria das tentativas bloqueadas: fora da transação revertida.
    if (error instanceof LastSuperAdminError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.last_super_admin_blocked",
          entityType: "user",
          entityId: user.id,
          metadata: { attempted: "suspend" },
        },
      });
    } else if (error instanceof UserConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.processing_conflict",
          entityType: "user",
          entityId: user.id,
          metadata: { attempted: "suspend" },
        },
      });
    }
    throw error;
  }
}
