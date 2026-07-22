import { prisma } from "@/lib/prisma";
import { assertNotLastActiveAdmin } from "./guard-last-admin";
import { adminRoleForOrgType } from "../config/role-matrix";
import { MembershipConflictError, MembershipNotFoundError } from "./errors";

/**
 * Remoção lógica do vínculo (`status: ENDED` + `deletedAt`). Nunca apaga
 * fisicamente. Protege o último administrador ativo.
 */
export async function removeMembership(input: {
  membershipId: string;
  actorId: string;
}) {
  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, deletedAt: null },
    include: {
      organization: { include: { type: true } },
      roles: { include: { role: true } },
    },
  });
  if (!membership) throw new MembershipNotFoundError();

  return prisma.$transaction(async (tx) => {
    const adminRole = adminRoleForOrgType(membership.organization.type.code);
    const isAdmin = adminRole
      ? membership.roles.some((r) => r.role.code === adminRole)
      : false;
    if (isAdmin) {
      await assertNotLastActiveAdmin(
        tx,
        membership.organizationId,
        membership.id,
      );
    }

    const claimed = await tx.membership.updateMany({
      where: {
        id: membership.id,
        status: { in: ["ACTIVE", "SUSPENDED"] },
        deletedAt: null,
      },
      data: { status: "ENDED", deletedAt: new Date() },
    });
    if (claimed.count === 0) throw new MembershipConflictError();

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: membership.organizationId,
        action: "membership.removed",
        entityType: "membership",
        entityId: membership.id,
        metadata: { previousStatus: membership.status },
      },
    });

    await tx.notification.create({
      data: {
        userId: membership.userId,
        type: "membership.removed",
        title: "Vínculo encerrado",
        body: `Seu vínculo com ${membership.organization.name} foi encerrado.`,
        link: "/app",
      },
    });

    return tx.membership.findUniqueOrThrow({ where: { id: membership.id } });
  });
}
