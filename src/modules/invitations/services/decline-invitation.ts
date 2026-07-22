import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "../lib/token";
import {
  EmailMismatchError,
  InvitationConflictError,
  InvitationNotFoundError,
} from "./errors";

export async function declineInvitation(input: {
  token: string;
  actorUserId: string;
  actorEmail: string;
}): Promise<void> {
  const tokenHash = hashInvitationToken(input.token);
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
  });
  if (!invitation) throw new InvitationNotFoundError();
  if (invitation.email !== input.actorEmail.trim().toLowerCase())
    throw new EmailMismatchError();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "DECLINED", declinedAt: new Date() },
    });
    if (claimed.count === 0) throw new InvitationConflictError();

    await tx.notification.create({
      data: {
        userId: invitation.invitedById,
        type: "invitation.declined",
        title: "Convite recusado",
        body: `${input.actorEmail} recusou o convite.`,
        link: "/app/convites",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorUserId,
        organizationId: invitation.organizationId,
        action: "invitation.declined",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {},
      },
    });
  });
}
