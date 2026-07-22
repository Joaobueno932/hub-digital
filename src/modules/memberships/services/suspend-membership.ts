import { prisma } from "@/lib/prisma";
import { assertNotLastActiveAdmin } from "./guard-last-admin";
import { adminRoleForOrgType } from "../config/role-matrix";
import { MembershipConflictError, MembershipNotFoundError } from "./errors";

/**
 * Suspende um vínculo (`status: SUSPENDED`). Bloqueia se for o último
 * administrador ativo da organização — inclusive quando o próprio ator tenta
 * suspender a si mesmo.
 */
export async function suspendMembership(input: {
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

  try {
    return await prisma.$transaction(async (tx) => {
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
        where: { id: membership.id, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });
      // Conflito de corrida: auditado no catch (fora da transação revertida).
      if (claimed.count === 0) throw new MembershipConflictError();

      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: membership.organizationId,
          action: "membership.suspended",
          entityType: "membership",
          entityId: membership.id,
          metadata: { previousStatus: "ACTIVE" },
        },
      });

      await tx.notification.create({
        data: {
          userId: membership.userId,
          type: "membership.suspended",
          title: "Vínculo suspenso",
          body: `Seu vínculo com ${membership.organization.name} foi suspenso.`,
          link: "/app",
        },
      });

      return tx.membership.findUniqueOrThrow({ where: { id: membership.id } });
    });
  } catch (error) {
    if (error instanceof MembershipConflictError) {
      await prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          organizationId: membership.organizationId,
          action: "membership.processing_conflict",
          entityType: "membership",
          entityId: membership.id,
          metadata: { attempted: "suspend" },
        },
      });
    }
    throw error;
  }
}
