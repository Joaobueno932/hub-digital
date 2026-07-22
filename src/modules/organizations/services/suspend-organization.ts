import { prisma } from "@/lib/prisma";
import {
  OrganizationAlreadyInStatusError,
  OrganizationConflictError,
  OrganizationNotFoundError,
} from "./errors";

/**
 * Suspende uma organização. Organizações suspensas não são resolvidas como
 * vínculo válido: `getUserMemberships`
 * (src/modules/permissions/services/authorization.ts) já filtra por
 * `organization.status === "ACTIVE"`, então a suspensão automaticamente
 * impede login/uso da organização como ativa — nenhuma mudança adicional é
 * necessária ali.
 */
export async function suspendOrganization(input: {
  organizationId: string;
  actorId: string;
}) {
  const org = await prisma.organization.findFirst({
    where: { id: input.organizationId, deletedAt: null },
  });
  if (!org) throw new OrganizationNotFoundError();
  if (org.status === "SUSPENDED") throw new OrganizationAlreadyInStatusError();

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.organization.updateMany({
      where: { id: input.organizationId, status: org.status },
      data: { status: "SUSPENDED" },
    });
    if (claimed.count === 0) throw new OrganizationConflictError();

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: "organization.suspended",
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
          type: "organization.suspended",
          title: "Organização suspensa",
          body: `${org.name} foi suspensa por um administrador.`,
          link: "/app/minha-organizacao",
        })),
      });
    }

    return tx.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
    });
  });
}
