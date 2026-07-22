/**
 * Testes de integração do ciclo de vida de convites (PostgreSQL real).
 * Fixtures próprias: organização de teste com um administrador.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createInvitation } from "../services/create-invitation";
import { acceptInvitation } from "../services/accept-invitation";
import { declineInvitation } from "../services/decline-invitation";
import { revokeInvitation } from "../services/revoke-invitation";
import { hashInvitationToken } from "../lib/token";
import {
  DuplicateInvitationError,
  DuplicateMembershipError,
  EmailMismatchError,
  InvitationConflictError,
  InvitationExpiredError,
  InvitationRoleNotAllowedError,
} from "../services/errors";

let orgId: string;
let adminUserId: string;
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];
const createdInvitationIds: string[] = [];

beforeAll(async () => {
  const startupType = await prisma.organizationType.findUniqueOrThrow({
    where: { code: "STARTUP" },
  });
  const org = await prisma.organization.create({
    data: {
      name: `Org Convites ${Date.now()}`,
      slug: `org-convites-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      typeId: startupType.id,
      status: "ACTIVE",
    },
  });
  orgId = org.id;
  createdOrgIds.push(org.id);

  const admStartupRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADM_STARTUP" },
  });
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin Convites",
      email: `admin-convites-${Date.now()}@test.local`,
      status: "ACTIVE",
    },
  });
  adminUserId = adminUser.id;
  createdUserIds.push(adminUser.id);
  const adminMembership = await prisma.membership.create({
    data: { userId: adminUser.id, organizationId: org.id, status: "ACTIVE" },
  });
  await prisma.membershipRole.create({
    data: { membershipId: adminMembership.id, roleId: admStartupRole.id },
  });
});

afterAll(async () => {
  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [{ userId: { in: createdUserIds } }, { userId: adminUserId }],
    },
  });
  await prisma.organizationInvitation.deleteMany({
    where: {
      id: { in: [...createdInvitationIds, ...invitations.map((i) => i.id)] },
    },
  });
  await prisma.membershipRole.deleteMany({
    where: { membership: { organizationId: { in: createdOrgIds } } },
  });
  await prisma.membership.deleteMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: createdOrgIds } },
  });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("createInvitation", () => {
  it("cria convite, persiste apenas o hash do token e audita sem o token", async () => {
    const email = `convidado-${Date.now()}@test.local`;
    const result = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(result.invitationId);

    const stored = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: result.invitationId },
    });
    expect(stored.tokenHash).toBe(hashInvitationToken(result.token));
    expect(stored.tokenHash).not.toBe(result.token);
    expect(stored.status).toBe("PENDING");

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: result.invitationId, action: "invitation.created" },
    });
    expect(JSON.stringify(audit.metadata)).not.toContain(result.token);
  });

  it("rejeita papel incompatível com o tipo da organização", async () => {
    await expect(
      createInvitation({
        organizationId: orgId,
        email: `x-${Date.now()}@test.local`,
        roleCode: "ADM_ESPACO_INOVACAO",
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(InvitationRoleNotAllowedError);
  });

  it("rejeita tentativa de convite com papel SUPER_ADMIN", async () => {
    await expect(
      createInvitation({
        organizationId: orgId,
        email: `x-${Date.now()}@test.local`,
        roleCode: "SUPER_ADMIN",
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(InvitationRoleNotAllowedError);
  });

  it("rejeita convite duplicado (mesmo e-mail pendente na mesma organização)", async () => {
    const email = `duplicado-${Date.now()}@test.local`;
    const first = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(first.invitationId);

    await expect(
      createInvitation({
        organizationId: orgId,
        email,
        roleCode: "USUARIO_EQUIPE_STARTUP",
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(DuplicateInvitationError);
  });

  it("rejeita convite para e-mail que já é membro ativo", async () => {
    const existingMemberEmail = `membro-existente-${Date.now()}@test.local`;
    const existingUser = await prisma.user.create({
      data: {
        name: "Membro Existente",
        email: existingMemberEmail,
        status: "ACTIVE",
      },
    });
    createdUserIds.push(existingUser.id);
    const equipeRole = await prisma.role.findUniqueOrThrow({
      where: { code: "USUARIO_EQUIPE_STARTUP" },
    });
    const membership = await prisma.membership.create({
      data: {
        userId: existingUser.id,
        organizationId: orgId,
        status: "ACTIVE",
      },
    });
    await prisma.membershipRole.create({
      data: { membershipId: membership.id, roleId: equipeRole.id },
    });

    await expect(
      createInvitation({
        organizationId: orgId,
        email: existingMemberEmail,
        roleCode: "USUARIO_EQUIPE_STARTUP",
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(DuplicateMembershipError);
  });

  it("criações concorrentes do mesmo convite: apenas uma processa", async () => {
    const email = `concorrente-${Date.now()}@test.local`;
    const results = await Promise.allSettled([
      createInvitation({
        organizationId: orgId,
        email,
        roleCode: "USUARIO_EQUIPE_STARTUP",
        actorId: adminUserId,
      }),
      createInvitation({
        organizationId: orgId,
        email,
        roleCode: "USUARIO_EQUIPE_STARTUP",
        actorId: adminUserId,
      }),
    ]);
    const fulfilled = results.filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof createInvitation>>
      > => r.status === "fulfilled",
    );
    expect(fulfilled.length).toBe(1);
    createdInvitationIds.push(fulfilled[0].value.invitationId);

    const count = await prisma.organizationInvitation.count({
      where: { organizationId: orgId, email, status: "PENDING" },
    });
    expect(count).toBe(1);
  });
});

describe("acceptInvitation", () => {
  it("aceita convite válido: cria membership com o papel do convite, notifica e audita", async () => {
    const email = `aceitar-${Date.now()}@test.local`;
    const invitedUser = await prisma.user.create({
      data: { name: "Convidado Aceita", email, status: "ACTIVE" },
    });
    createdUserIds.push(invitedUser.id);

    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);

    const result = await acceptInvitation({
      token: invite.token,
      actorUserId: invitedUser.id,
      actorEmail: email,
    });
    expect(result.organizationId).toBe(orgId);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: invitedUser.id,
          organizationId: orgId,
        },
      },
      include: { roles: { include: { role: true } } },
    });
    expect(membership.status).toBe("ACTIVE");
    expect(membership.roles.map((r) => r.role.code)).toEqual([
      "USUARIO_EQUIPE_STARTUP",
    ]);

    const invitationRow = await prisma.organizationInvitation.findUniqueOrThrow(
      {
        where: { id: invite.invitationId },
      },
    );
    expect(invitationRow.status).toBe("ACCEPTED");
    expect(invitationRow.acceptedById).toBe(invitedUser.id);

    const audit = await prisma.auditLog.count({
      where: { entityId: invite.invitationId, action: "invitation.accepted" },
    });
    expect(audit).toBe(1);
  });

  it("rejeita aceitação por usuário com e-mail diferente do convite", async () => {
    const email = `so-para-fulano-${Date.now()}@test.local`;
    const otherUser = await prisma.user.create({
      data: {
        name: "Outro Usuário",
        email: `outro-${Date.now()}@test.local`,
        status: "ACTIVE",
      },
    });
    createdUserIds.push(otherUser.id);

    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);

    await expect(
      acceptInvitation({
        token: invite.token,
        actorUserId: otherUser.id,
        actorEmail: otherUser.email,
      }),
    ).rejects.toBeInstanceOf(EmailMismatchError);

    const unchanged = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: invite.invitationId },
    });
    expect(unchanged.status).toBe("PENDING");
  });

  it("rejeita token inválido", async () => {
    await expect(
      acceptInvitation({
        token: "token-que-nao-existe-00000000000000000000",
        actorUserId: adminUserId,
        actorEmail: "qualquer@test.local",
      }),
    ).rejects.toThrow();
  });

  it("rejeita convite vencido e marca como EXPIRED", async () => {
    const email = `vencido-${Date.now()}@test.local`;
    const invitedUser = await prisma.user.create({
      data: { name: "Convidado Vencido", email, status: "ACTIVE" },
    });
    createdUserIds.push(invitedUser.id);

    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);
    await prisma.organizationInvitation.update({
      where: { id: invite.invitationId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      acceptInvitation({
        token: invite.token,
        actorUserId: invitedUser.id,
        actorEmail: email,
      }),
    ).rejects.toBeInstanceOf(InvitationExpiredError);

    const updated = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: invite.invitationId },
    });
    expect(updated.status).toBe("EXPIRED");
  });

  it("aceitação repetida (duplo clique) é idempotente e segura", async () => {
    const email = `duplo-clique-${Date.now()}@test.local`;
    const invitedUser = await prisma.user.create({
      data: { name: "Duplo Clique", email, status: "ACTIVE" },
    });
    createdUserIds.push(invitedUser.id);

    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);

    const results = await Promise.allSettled([
      acceptInvitation({
        token: invite.token,
        actorUserId: invitedUser.id,
        actorEmail: email,
      }),
      acceptInvitation({
        token: invite.token,
        actorUserId: invitedUser.id,
        actorEmail: email,
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toBeInstanceOf(InvitationConflictError);
    }

    const membershipCount = await prisma.membership.count({
      where: { userId: invitedUser.id, organizationId: orgId },
    });
    expect(membershipCount).toBe(1);
  });
});

describe("recusa e revogação", () => {
  it("recusa marca DECLINED e impede nova ação sobre o mesmo convite", async () => {
    const email = `recusa-${Date.now()}@test.local`;
    const invitedUser = await prisma.user.create({
      data: { name: "Recusa Teste", email, status: "ACTIVE" },
    });
    createdUserIds.push(invitedUser.id);

    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);

    await declineInvitation({
      token: invite.token,
      actorUserId: invitedUser.id,
      actorEmail: email,
    });
    const declined = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: invite.invitationId },
    });
    expect(declined.status).toBe("DECLINED");

    await expect(
      acceptInvitation({
        token: invite.token,
        actorUserId: invitedUser.id,
        actorEmail: email,
      }),
    ).rejects.toBeInstanceOf(InvitationConflictError);
  });

  it("revogação por administrador marca REVOKED e audita", async () => {
    const email = `revogar-${Date.now()}@test.local`;
    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);

    await revokeInvitation({
      invitationId: invite.invitationId,
      organizationId: orgId,
      actorId: adminUserId,
    });
    const revoked = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: invite.invitationId },
    });
    expect(revoked.status).toBe("REVOKED");

    const audit = await prisma.auditLog.count({
      where: { entityId: invite.invitationId, action: "invitation.revoked" },
    });
    expect(audit).toBe(1);
  });

  it("IDOR: revogação falha se o convite não pertence à organização informada", async () => {
    const otherType = await prisma.organizationType.findUniqueOrThrow({
      where: { code: "STARTUP" },
    });
    const otherOrg = await prisma.organization.create({
      data: {
        name: `Outra Org ${Date.now()}`,
        slug: `outra-org-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        typeId: otherType.id,
        status: "ACTIVE",
      },
    });
    createdOrgIds.push(otherOrg.id);

    const email = `idor-${Date.now()}@test.local`;
    const invite = await createInvitation({
      organizationId: orgId,
      email,
      roleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
    });
    createdInvitationIds.push(invite.invitationId);

    await expect(
      revokeInvitation({
        invitationId: invite.invitationId,
        organizationId: otherOrg.id, // organização errada
        actorId: adminUserId,
      }),
    ).rejects.toThrow();

    const unchanged = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: invite.invitationId },
    });
    expect(unchanged.status).toBe("PENDING");
  });
});
