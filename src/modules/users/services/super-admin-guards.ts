import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SUPER_ADMIN_ROLE } from "@/modules/permissions/services/authorization";
import { LastSuperAdminError, SuperAdminProtectedError } from "./errors";

type TxClient = Prisma.TransactionClient;

/** Um usuário é SUPER_ADMIN se tiver o papel em qualquer vínculo ativo. */
export async function isUserSuperAdmin(
  client: TxClient | typeof prisma,
  userId: string,
): Promise<boolean> {
  const count = await client.membership.count({
    where: {
      userId,
      status: "ACTIVE",
      deletedAt: null,
      roles: { some: { role: { code: SUPER_ADMIN_ROLE } } },
    },
  });
  return count > 0;
}

/**
 * Só SUPER_ADMIN administra outro SUPER_ADMIN — impede que ADM_HUB suspenda
 * ou edite uma conta de super administrador.
 */
export async function assertCanAdministerTarget(
  client: TxClient | typeof prisma,
  targetUserId: string,
  actorIsSuperAdmin: boolean,
): Promise<void> {
  if (actorIsSuperAdmin) return;
  if (await isUserSuperAdmin(client, targetUserId))
    throw new SuperAdminProtectedError();
}

/**
 * Garante que a plataforma continue com ao menos um SUPER_ADMIN ativo depois
 * da operação, excluindo `excludedUserId` da contagem (a suspensão em curso
 * ainda não foi persistida). Vale inclusive para o próprio SUPER_ADMIN.
 */
export async function assertNotLastActiveSuperAdmin(
  tx: TxClient,
  excludedUserId: string,
): Promise<void> {
  const remaining = await tx.membership.count({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      userId: { not: excludedUserId },
      user: { status: "ACTIVE", deletedAt: null },
      roles: { some: { role: { code: SUPER_ADMIN_ROLE } } },
    },
  });
  if (remaining === 0) throw new LastSuperAdminError();
}
