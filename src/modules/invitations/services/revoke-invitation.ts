import { prisma } from "@/lib/prisma";
import { InvitationConflictError, InvitationNotFoundError } from "./errors";

export async function revokeInvitation(input: {
  invitationId: string;
  organizationId: string;
  actorId: string;
}): Promise<void> {
  const invitation = await prisma.organizationInvitation.findFirst({
    where: { id: input.invitationId, organizationId: input.organizationId },
  });
  if (!invitation) throw new InvitationNotFoundError();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    if (claimed.count === 0) throw new InvitationConflictError();

    const invitedUser = await tx.user.findUnique({
      where: { email: invitation.email },
    });
    if (invitedUser) {
      await tx.notification.create({
        data: {
          userId: invitedUser.id,
          type: "invitation.revoked",
          title: "Convite revogado",
          body: "Um convite enviado a você foi revogado.",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: input.organizationId,
        action: "invitation.revoked",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {},
      },
    });
  });
}
