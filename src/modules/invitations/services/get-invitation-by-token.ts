import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "../lib/token";

/**
 * Leitura pública (rota autenticada, mas antes da decisão de aceitar/recusar).
 * Aplica a expiração preguiçosa ao carregar, como no restante do módulo.
 */
export async function getInvitationByToken(token: string) {
  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
    include: { organization: true, role: true },
  });
  if (!invitation) return null;

  if (invitation.status === "PENDING" && invitation.expiresAt < new Date()) {
    const updated = await prisma.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (updated.count > 0) {
      await prisma.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          action: "invitation.expired",
          entityType: "invitation",
          entityId: invitation.id,
          metadata: {},
        },
      });
    }
    return { ...invitation, status: "EXPIRED" as const };
  }

  return invitation;
}
