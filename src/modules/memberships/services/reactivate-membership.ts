import { prisma } from "@/lib/prisma";
import { MembershipConflictError, MembershipNotFoundError } from "./errors";

export async function reactivateMembership(input: {
  membershipId: string;
  actorId: string;
}) {
  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, deletedAt: null },
    include: { organization: true },
  });
  if (!membership) throw new MembershipNotFoundError();

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.membership.updateMany({
      where: { id: membership.id, status: "SUSPENDED" },
      data: { status: "ACTIVE" },
    });
    if (claimed.count === 0) throw new MembershipConflictError();

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: membership.organizationId,
        action: "membership.reactivated",
        entityType: "membership",
        entityId: membership.id,
        metadata: { previousStatus: "SUSPENDED" },
      },
    });

    await tx.notification.create({
      data: {
        userId: membership.userId,
        type: "membership.reactivated",
        title: "Vínculo reativado",
        body: `Seu vínculo com ${membership.organization.name} foi reativado.`,
        link: "/app",
      },
    });

    return tx.membership.findUniqueOrThrow({ where: { id: membership.id } });
  });
}
