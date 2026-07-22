import { prisma } from "@/lib/prisma";

/**
 * Lista convites de uma organização, aplicando expiração preguiçosa: qualquer
 * convite PENDING com `expiresAt` no passado é marcado EXPIRED antes da
 * leitura (ver docs/decisoes-tecnicas.md — sem job agendado nesta etapa).
 */
export async function listOrganizationInvitations(organizationId: string) {
  const now = new Date();
  await prisma.organizationInvitation.updateMany({
    where: { organizationId, status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  return prisma.organizationInvitation.findMany({
    where: { organizationId },
    include: { role: true, invitedBy: true, acceptedBy: true },
    orderBy: { createdAt: "desc" },
  });
}
