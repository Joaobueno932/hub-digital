import { prisma } from "@/lib/prisma";
import {
  OrganizationAlreadyInStatusError,
  OrganizationConflictError,
  OrganizationNotFoundError,
} from "./errors";

export async function reactivateOrganization(input: {
  organizationId: string;
  actorId: string;
}) {
  const org = await prisma.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
  });
  if (!org) throw new OrganizationNotFoundError();
  if (org.status === "ACTIVE") throw new OrganizationAlreadyInStatusError();

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.organization.updateMany({
      where: { id: input.organizationId, status: org.status },
      data: { status: "ACTIVE" },
    });
    if (claimed.count === 0) throw new OrganizationConflictError();

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: "organization.reactivated",
        entityType: "organization",
        entityId: input.organizationId,
        metadata: { previousStatus: org.status },
      },
    });

    const admins = await tx.membership.findMany({
      where: { organizationId: input.organizationId, status: "ACTIVE" },
      select: { userId: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((m) => ({
          userId: m.userId,
          type: "organization.reactivated",
          title: "Organização reativada",
          body: `${org.name} foi reativada por um administrador.`,
          link: "/app/minha-organizacao",
        })),
      });
    }

    return tx.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
    });
  });
}
