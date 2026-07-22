import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "../lib/token";
import {
  EmailMismatchError,
  InvitationConflictError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from "./errors";

export type AcceptedInvitationResult = {
  organizationId: string;
  organizationName: string;
  membershipId: string;
};

/**
 * Aceita um convite pelo token bruto (validado contra o hash persistido).
 *
 * Idempotência/concorrência: `updateMany` condicionado a `status: PENDING`
 * garante que duas abas ou duplo clique produzam apenas uma aceitação — a
 * segunda tentativa recebe `InvitationConflictError` sem efeito colateral.
 */
export async function acceptInvitation(input: {
  token: string;
  actorUserId: string;
  actorEmail: string;
}): Promise<AcceptedInvitationResult> {
  const tokenHash = hashInvitationToken(input.token);
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
    include: { organization: true, role: true },
  });
  if (!invitation) throw new InvitationNotFoundError();

  const now = new Date();
  if (invitation.status === "PENDING" && invitation.expiresAt < now) {
    await prisma.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        action: "invitation.expired",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {},
      },
    });
    throw new InvitationExpiredError();
  }
  if (invitation.status !== "PENDING") throw new InvitationConflictError();

  if (invitation.email !== input.actorEmail.trim().toLowerCase()) {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorUserId,
        organizationId: invitation.organizationId,
        action: "invitation.email_mismatch",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: {},
      },
    });
    throw new EmailMismatchError();
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.organizationInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: {
        status: "ACCEPTED",
        acceptedAt: now,
        acceptedById: input.actorUserId,
      },
    });
    if (claimed.count === 0) {
      await tx.auditLog.create({
        data: {
          actorId: input.actorUserId,
          organizationId: invitation.organizationId,
          action: "invitation.processing_conflict",
          entityType: "invitation",
          entityId: invitation.id,
          metadata: { attempted: "accept" },
        },
      });
      throw new InvitationConflictError();
    }

    const membership = await tx.membership.upsert({
      where: {
        userId_organizationId: {
          userId: input.actorUserId,
          organizationId: invitation.organizationId,
        },
      },
      update: { status: "ACTIVE", deletedAt: null },
      create: {
        userId: input.actorUserId,
        organizationId: invitation.organizationId,
        status: "ACTIVE",
        createdById: invitation.invitedById,
      },
    });

    // Apenas o papel do convite é atribuído — substitui papéis anteriores
    // (mesmo modelo de "um papel por vínculo" usado no resto do domínio).
    await tx.membershipRole.deleteMany({
      where: { membershipId: membership.id },
    });
    await tx.membershipRole.create({
      data: {
        membershipId: membership.id,
        roleId: invitation.roleId,
        assignedById: invitation.invitedById,
      },
    });

    await tx.notification.create({
      data: {
        userId: invitation.invitedById,
        type: "invitation.accepted",
        title: "Convite aceito",
        body: `${input.actorEmail} aceitou o convite para ${invitation.organization.name}.`,
        link: "/app/convites",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorUserId,
        organizationId: invitation.organizationId,
        action: "invitation.accepted",
        entityType: "invitation",
        entityId: invitation.id,
        metadata: { role: invitation.role.code },
      },
    });

    return {
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
      membershipId: membership.id,
    };
  });
}
