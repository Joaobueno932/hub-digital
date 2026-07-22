/**
 * Testes de integração de gestão de membros (PostgreSQL real).
 * Fixtures próprias: organização de teste com um admin e um membro comum.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateMembershipRole } from "../services/update-role";
import { suspendMembership } from "../services/suspend-membership";
import { reactivateMembership } from "../services/reactivate-membership";
import { removeMembership } from "../services/remove-membership";
import {
  LastAdminError,
  MembershipConflictError,
  RoleNotAllowedError,
  SelfElevationError,
} from "../services/errors";

let orgId: string;
let adminMembershipId: string;
let memberMembershipId: string;
let adminUserId: string;
let memberUserId: string;
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

beforeAll(async () => {
  const startupType = await prisma.organizationType.findUniqueOrThrow({
    where: { code: "STARTUP" },
  });
  const org = await prisma.organization.create({
    data: {
      name: `Org Membros ${Date.now()}`,
      slug: `org-membros-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      typeId: startupType.id,
      status: "ACTIVE",
    },
  });
  orgId = org.id;
  createdOrgIds.push(org.id);

  const admStartupRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADM_STARTUP" },
  });
  const equipeRole = await prisma.role.findUniqueOrThrow({
    where: { code: "USUARIO_EQUIPE_STARTUP" },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: "Admin Teste",
      email: `admin-membros-${Date.now()}@test.local`,
      status: "ACTIVE",
    },
  });
  adminUserId = adminUser.id;
  createdUserIds.push(adminUser.id);
  const adminMembership = await prisma.membership.create({
    data: { userId: adminUser.id, organizationId: org.id, status: "ACTIVE" },
  });
  adminMembershipId = adminMembership.id;
  await prisma.membershipRole.create({
    data: { membershipId: adminMembership.id, roleId: admStartupRole.id },
  });

  const memberUser = await prisma.user.create({
    data: {
      name: "Membro Teste",
      email: `membro-teste-${Date.now()}@test.local`,
      status: "ACTIVE",
    },
  });
  memberUserId = memberUser.id;
  createdUserIds.push(memberUser.id);
  const memberMembership = await prisma.membership.create({
    data: { userId: memberUser.id, organizationId: org.id, status: "ACTIVE" },
  });
  memberMembershipId = memberMembership.id;
  await prisma.membershipRole.create({
    data: { membershipId: memberMembership.id, roleId: equipeRole.id },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.membershipRole.deleteMany({
    where: { membershipId: { in: [adminMembershipId, memberMembershipId] } },
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

describe("updateMembershipRole", () => {
  it("rejeita papel fora do tipo da organização", async () => {
    await expect(
      updateMembershipRole({
        membershipId: memberMembershipId,
        newRoleCode: "ADM_ESPACO_INOVACAO",
        actorId: adminUserId,
        actorIsSuperAdmin: false,
        actorRoleCodesInOrg: ["ADM_STARTUP"],
      }),
    ).rejects.toBeInstanceOf(RoleNotAllowedError);
  });

  it("rejeita atribuição de SUPER_ADMIN por ator comum", async () => {
    await expect(
      updateMembershipRole({
        membershipId: memberMembershipId,
        newRoleCode: "SUPER_ADMIN",
        actorId: adminUserId,
        actorIsSuperAdmin: false,
        actorRoleCodesInOrg: ["ADM_STARTUP"],
      }),
    ).rejects.toBeInstanceOf(RoleNotAllowedError);
  });

  it("bloqueia autoelevação: ator sem ADM_STARTUP não pode conceder ADM_STARTUP", async () => {
    await expect(
      updateMembershipRole({
        membershipId: memberMembershipId,
        newRoleCode: "ADM_STARTUP",
        actorId: memberUserId,
        actorIsSuperAdmin: false,
        actorRoleCodesInOrg: ["USUARIO_EQUIPE_STARTUP"],
      }),
    ).rejects.toBeInstanceOf(SelfElevationError);
  });

  it("bloqueia rebaixar o último administrador ativo", async () => {
    await expect(
      updateMembershipRole({
        membershipId: adminMembershipId,
        newRoleCode: "USUARIO_EQUIPE_STARTUP",
        actorId: adminUserId,
        actorIsSuperAdmin: false,
        actorRoleCodesInOrg: ["ADM_STARTUP"],
      }),
    ).rejects.toBeInstanceOf(LastAdminError);

    const unchanged = await prisma.membershipRole.findMany({
      where: { membershipId: adminMembershipId },
      include: { role: true },
    });
    expect(unchanged.map((r) => r.role.code)).toContain("ADM_STARTUP");
  });

  it("promove membro comum a administrador com sucesso e audita", async () => {
    const result = await updateMembershipRole({
      membershipId: memberMembershipId,
      newRoleCode: "ADM_STARTUP",
      actorId: adminUserId,
      actorIsSuperAdmin: false,
      actorRoleCodesInOrg: ["ADM_STARTUP"],
    });
    expect(result.id).toBe(memberMembershipId);

    const roles = await prisma.membershipRole.findMany({
      where: { membershipId: memberMembershipId },
      include: { role: true },
    });
    expect(roles.map((r) => r.role.code)).toEqual(["ADM_STARTUP"]);

    const audits = await prisma.auditLog.count({
      where: {
        entityId: memberMembershipId,
        action: "membership.role_updated",
      },
    });
    expect(audits).toBe(1);

    // Agora há dois administradores — reverte para o cenário original.
    await updateMembershipRole({
      membershipId: memberMembershipId,
      newRoleCode: "USUARIO_EQUIPE_STARTUP",
      actorId: adminUserId,
      actorIsSuperAdmin: false,
      actorRoleCodesInOrg: ["ADM_STARTUP"],
    });
  });
});

describe("suspensão, reativação e remoção", () => {
  it("bloqueia suspender o último administrador", async () => {
    await expect(
      suspendMembership({
        membershipId: adminMembershipId,
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("bloqueia remover o último administrador", async () => {
    await expect(
      removeMembership({
        membershipId: adminMembershipId,
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(LastAdminError);
  });

  it("suspende e reativa um membro comum normalmente", async () => {
    await suspendMembership({
      membershipId: memberMembershipId,
      actorId: adminUserId,
    });
    const suspended = await prisma.membership.findUniqueOrThrow({
      where: { id: memberMembershipId },
    });
    expect(suspended.status).toBe("SUSPENDED");

    await expect(
      suspendMembership({
        membershipId: memberMembershipId,
        actorId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(MembershipConflictError);

    await reactivateMembership({
      membershipId: memberMembershipId,
      actorId: adminUserId,
    });
    const reactivated = await prisma.membership.findUniqueOrThrow({
      where: { id: memberMembershipId },
    });
    expect(reactivated.status).toBe("ACTIVE");
  });

  it("remove logicamente um membro comum (nunca apaga fisicamente)", async () => {
    await removeMembership({
      membershipId: memberMembershipId,
      actorId: adminUserId,
    });
    const removed = await prisma.membership.findUniqueOrThrow({
      where: { id: memberMembershipId },
    });
    expect(removed.status).toBe("ENDED");
    expect(removed.deletedAt).not.toBeNull();
  });

  it("suspensões concorrentes do mesmo vínculo: apenas uma processa", async () => {
    // Recria um membro ativo para o teste de concorrência.
    const equipeRole = await prisma.role.findUniqueOrThrow({
      where: { code: "USUARIO_EQUIPE_STARTUP" },
    });
    const tempUser = await prisma.user.create({
      data: {
        name: "Concorrência Teste",
        email: `concorrencia-${Date.now()}@test.local`,
        status: "ACTIVE",
      },
    });
    createdUserIds.push(tempUser.id);
    const tempMembership = await prisma.membership.create({
      data: { userId: tempUser.id, organizationId: orgId, status: "ACTIVE" },
    });
    await prisma.membershipRole.create({
      data: { membershipId: tempMembership.id, roleId: equipeRole.id },
    });

    const results = await Promise.allSettled([
      suspendMembership({
        membershipId: tempMembership.id,
        actorId: adminUserId,
      }),
      suspendMembership({
        membershipId: tempMembership.id,
        actorId: adminUserId,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);

    // O conflito de corrida do perdedor deve ficar auditado — antes da
    // correção, o registro era criado dentro da transação e desaparecia no
    // rollback ao lançar o erro.
    const conflictAudits = await prisma.auditLog.count({
      where: {
        entityId: tempMembership.id,
        action: "membership.processing_conflict",
      },
    });
    expect(conflictAudits).toBe(1);
  });
});
