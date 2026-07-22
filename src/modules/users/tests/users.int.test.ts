/**
 * Testes de integração da administração de usuários (PostgreSQL real).
 * Fixtures próprias, criadas e removidas pelo teste — o seed não é alterado.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { suspendUser } from "../services/suspend-user";
import { reactivateUser } from "../services/reactivate-user";
import { updateUser } from "../services/update-user";
import { listUsers } from "../services/list-users";
import { getUserDetail } from "../services/get-user-detail";
import {
  isUserSuperAdmin,
  assertNotLastActiveSuperAdmin,
} from "../services/super-admin-guards";
import {
  LastSuperAdminError,
  SelfSuspensionError,
  SuperAdminProtectedError,
  UserConflictError,
  UserNotFoundError,
} from "../services/errors";

let admHubId: string;
let superadminId: string;
let targetId: string;
let hubOrgId: string;
const createdUserIds: string[] = [];

beforeAll(async () => {
  admHubId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "admhub@dev.hubdigital.local" },
    })
  ).id;
  superadminId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "superadmin@dev.hubdigital.local" },
    })
  ).id;
  hubOrgId = (
    await prisma.organization.findUniqueOrThrow({
      where: { slug: "hub-digital" },
    })
  ).id;

  const target = await prisma.user.create({
    data: {
      name: "Alvo Administrativo",
      email: `alvo-admin-${Date.now()}@test.local`,
      status: "ACTIVE",
    },
  });
  targetId = target.id;
  createdUserIds.push(target.id);
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityId: { in: createdUserIds } },
        { actorId: { in: createdUserIds } },
      ],
    },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.membershipRole.deleteMany({
    where: { membership: { userId: { in: createdUserIds } } },
  });
  await prisma.membership.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("suspensão e reativação", () => {
  it("suspende registrando motivo, ator, auditoria e notificação", async () => {
    const result = await suspendUser({
      userId: targetId,
      actorId: admHubId,
      actorIsSuperAdmin: false,
      reason: "Uso indevido da plataforma durante os testes.",
    });

    expect(result.status).toBe("SUSPENDED");
    expect(result.suspendedById).toBe(admHubId);
    expect(result.suspendedAt).not.toBeNull();
    expect(result.suspensionReason).toContain("Uso indevido");

    const audit = await prisma.auditLog.count({
      where: { entityId: targetId, action: "user.suspended" },
    });
    expect(audit).toBe(1);

    const notification = await prisma.notification.count({
      where: { userId: targetId, type: "user.suspended" },
    });
    expect(notification).toBe(1);
  });

  it("suspender de novo é conflito (idempotência)", async () => {
    await expect(
      suspendUser({
        userId: targetId,
        actorId: admHubId,
        actorIsSuperAdmin: false,
        reason: "Segunda tentativa de suspensão.",
      }),
    ).rejects.toBeInstanceOf(UserConflictError);
  });

  it("reativa limpando os campos de suspensão", async () => {
    const result = await reactivateUser({
      userId: targetId,
      actorId: admHubId,
      actorIsSuperAdmin: false,
    });
    expect(result.status).toBe("ACTIVE");
    expect(result.suspendedAt).toBeNull();
    expect(result.suspendedById).toBeNull();
    expect(result.suspensionReason).toBeNull();

    const audit = await prisma.auditLog.count({
      where: { entityId: targetId, action: "user.reactivated" },
    });
    expect(audit).toBe(1);
  });

  it("nada é apagado ao suspender: vínculos e notificações permanecem", async () => {
    const before = await prisma.notification.count({
      where: { userId: targetId },
    });
    await suspendUser({
      userId: targetId,
      actorId: admHubId,
      actorIsSuperAdmin: false,
      reason: "Verificação de preservação de dados.",
    });
    const after = await prisma.notification.count({
      where: { userId: targetId },
    });
    expect(after).toBeGreaterThanOrEqual(before);

    await reactivateUser({
      userId: targetId,
      actorId: admHubId,
      actorIsSuperAdmin: false,
    });
  });

  it("usuário inexistente falha com erro tipado", async () => {
    await expect(
      suspendUser({
        userId: "00000000-0000-4000-8000-000000000000",
        actorId: admHubId,
        actorIsSuperAdmin: false,
        reason: "Motivo suficientemente longo.",
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});

describe("proteções administrativas", () => {
  it("bloqueia auto-suspensão e audita a tentativa", async () => {
    await expect(
      suspendUser({
        userId: admHubId,
        actorId: admHubId,
        actorIsSuperAdmin: false,
        reason: "Tentativa de suspender a própria conta.",
      }),
    ).rejects.toBeInstanceOf(SelfSuspensionError);

    const audit = await prisma.auditLog.count({
      where: { entityId: admHubId, action: "user.self_suspension_blocked" },
    });
    expect(audit).toBeGreaterThanOrEqual(1);

    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { id: admHubId },
    });
    expect(unchanged.status).toBe("ACTIVE");
  });

  it("ADM_HUB não suspende nem edita um SUPER_ADMIN", async () => {
    await expect(
      suspendUser({
        userId: superadminId,
        actorId: admHubId,
        actorIsSuperAdmin: false,
        reason: "Tentativa indevida contra super administrador.",
      }),
    ).rejects.toBeInstanceOf(SuperAdminProtectedError);

    const target = await prisma.user.findUniqueOrThrow({
      where: { id: superadminId },
    });
    await expect(
      updateUser({
        userId: superadminId,
        actorId: admHubId,
        actorIsSuperAdmin: false,
        name: "Nome Alterado Indevidamente",
        expectedUpdatedAt: target.updatedAt,
      }),
    ).rejects.toBeInstanceOf(SuperAdminProtectedError);

    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { id: superadminId },
    });
    expect(unchanged.status).toBe("ACTIVE");
    expect(unchanged.name).not.toBe("Nome Alterado Indevidamente");
  });

  it("identifica corretamente quem é SUPER_ADMIN", async () => {
    expect(await isUserSuperAdmin(prisma, superadminId)).toBe(true);
    expect(await isUserSuperAdmin(prisma, targetId)).toBe(false);
  });

  it("bloqueia deixar a plataforma sem nenhum SUPER_ADMIN ativo", async () => {
    const secondary = await prisma.user.findUniqueOrThrow({
      where: { email: "superadmin2@dev.hubdigital.local" },
    });

    // Parte de um estado conhecido: o teste mexe num usuário do seed, então
    // não pode depender de execuções anteriores nem deixar sujeira.
    await prisma.user.update({
      where: { id: secondary.id },
      data: {
        status: "ACTIVE",
        suspendedAt: null,
        suspendedById: null,
        suspensionReason: null,
      },
    });

    try {
      // Com dois SUPER_ADMIN ativos, suspender um é permitido.
      await suspendUser({
        userId: secondary.id,
        actorId: superadminId,
        actorIsSuperAdmin: true,
        reason:
          "Suspensão temporária para teste do último super administrador.",
      });

      // Agora só resta um: a guarda barra, inclusive para SUPER_ADMIN.
      await prisma.$transaction(async (tx) => {
        await expect(
          assertNotLastActiveSuperAdmin(tx, superadminId),
        ).rejects.toBeInstanceOf(LastSuperAdminError);
      });

      await expect(
        suspendUser({
          userId: superadminId,
          actorId: secondary.id,
          actorIsSuperAdmin: true,
          reason: "Tentativa de suspender o último super administrador ativo.",
        }),
      ).rejects.toBeInstanceOf(LastSuperAdminError);

      // A auditoria do bloqueio sobrevive ao rollback da transação.
      const audit = await prisma.auditLog.count({
        where: {
          entityId: superadminId,
          action: "user.last_super_admin_blocked",
        },
      });
      expect(audit).toBeGreaterThanOrEqual(1);

      const stillActive = await prisma.user.findUniqueOrThrow({
        where: { id: superadminId },
      });
      expect(stillActive.status).toBe("ACTIVE");
    } finally {
      // Restaura o cenário do seed mesmo se alguma asserção falhar.
      await prisma.user.update({
        where: { id: secondary.id },
        data: {
          status: "ACTIVE",
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
        },
      });
    }
  });
});

describe("edição de dados permitidos", () => {
  it("atualiza o nome e audita antes/depois", async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: targetId },
    });
    const updated = await updateUser({
      userId: targetId,
      actorId: admHubId,
      actorIsSuperAdmin: false,
      name: "Alvo Renomeado",
      expectedUpdatedAt: before.updatedAt,
    });
    expect(updated.name).toBe("Alvo Renomeado");
    // E-mail permanece intocado — não é editável por esta via.
    expect(updated.email).toBe(before.email);

    const audit = await prisma.auditLog.count({
      where: { entityId: targetId, action: "user.updated" },
    });
    expect(audit).toBe(1);
  });

  it("edição concorrente (updatedAt divergente) é rejeitada", async () => {
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: targetId },
    });
    await expect(
      updateUser({
        userId: targetId,
        actorId: admHubId,
        actorIsSuperAdmin: false,
        name: "Nome Perdido",
        expectedUpdatedAt: new Date(current.updatedAt.getTime() - 60_000),
      }),
    ).rejects.toBeInstanceOf(UserConflictError);

    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { id: targetId },
    });
    expect(unchanged.name).not.toBe("Nome Perdido");
  });
});

describe("listagem e detalhe", () => {
  it("filtra por status e por busca", async () => {
    const byStatus = await listUsers({ status: "SUSPENDED" });
    expect(byStatus.users.every((u) => u.status === "SUSPENDED")).toBe(true);

    const bySearch = await listUsers({ search: "superadmin@" });
    expect(bySearch.users.length).toBeGreaterThanOrEqual(1);
    expect(bySearch.users[0].email).toContain("superadmin@");
  });

  it("filtra por organização e papel", async () => {
    const byOrg = await listUsers({ organizationId: hubOrgId });
    expect(byOrg.users.length).toBeGreaterThanOrEqual(1);

    const byRole = await listUsers({ roleCode: "SUPER_ADMIN" });
    expect(byRole.users.length).toBeGreaterThanOrEqual(1);
  });

  it("pagina os resultados", async () => {
    const page1 = await listUsers({ page: 1 });
    expect(page1.pageSize).toBe(20);
    expect(page1.users.length).toBeLessThanOrEqual(20);
    expect(page1.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("a listagem nunca expõe passwordHash", async () => {
    const { users } = await listUsers({ search: "superadmin@" });
    for (const u of users) {
      expect(u).not.toHaveProperty("passwordHash");
    }
  });

  it("o detalhe traz vínculos e não expõe segredos", async () => {
    const detail = await getUserDetail(superadminId);
    expect(detail).not.toBeNull();
    expect(detail!.user.memberships.length).toBeGreaterThanOrEqual(1);
    expect(detail!.user).not.toHaveProperty("passwordHash");
    expect(detail!.user).not.toHaveProperty("accounts");
    expect(detail!.user).not.toHaveProperty("sessions");
  });

  it("detalhe de usuário inexistente retorna null (404 genérico na rota)", async () => {
    expect(
      await getUserDetail("00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });
});
