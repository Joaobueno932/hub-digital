/**
 * Testes de integração da autorização contra o PostgreSQL do Docker Compose
 * (dados do seed + fixtures temporárias criadas e removidas pelo próprio teste).
 *
 * Pré-requisitos: `docker compose up -d`, migrations e seed aplicados.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessModule,
  getUserMemberships,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isFeatureEnabled,
  isSuperAdmin,
  resolveActiveMembership,
} from "../services/authorization";

async function userId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return user.id;
}

async function orgId(slug: string): Promise<string> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug } });
  return org.id;
}

describe("autorização (integração)", () => {
  let espacoId: string;
  let startupId: string;
  let hubId: string;

  beforeAll(async () => {
    espacoId = await orgId("espaco-inovacao-centro");
    startupId = await orgId("startup-aurora");
    hubId = await orgId("hub-digital");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("usuário sem vínculos não tem memberships nem organização ativa", async () => {
    const id = await userId("comum@dev.hubdigital.local");
    const memberships = await getUserMemberships(id);
    expect(memberships).toHaveLength(0);
    expect(resolveActiveMembership(memberships, null)).toBeNull();
    expect(await hasPermission(id, espacoId, "members.manage")).toBe(false);
  });

  it("usuário com um vínculo resolve a organização ativa por fallback", async () => {
    const id = await userId("admstartup@dev.hubdigital.local");
    const memberships = await getUserMemberships(id);
    expect(memberships).toHaveLength(1);
    const active = resolveActiveMembership(memberships, null);
    expect(active?.organizationId).toBe(startupId);
  });

  it("usuário multi-organização alterna entre vínculos válidos", async () => {
    const id = await userId("multi@dev.hubdigital.local");
    const memberships = await getUserMemberships(id);
    expect(memberships.length).toBe(2);
    expect(
      resolveActiveMembership(memberships, startupId)?.organizationId,
    ).toBe(startupId);
    expect(resolveActiveMembership(memberships, espacoId)?.organizationId).toBe(
      espacoId,
    );
  });

  it("organização ativa inválida (sem vínculo) cai no fallback — não é aceita", async () => {
    const id = await userId("admstartup@dev.hubdigital.local");
    const memberships = await getUserMemberships(id);
    const active = resolveActiveMembership(memberships, espacoId);
    expect(active?.organizationId).toBe(startupId); // nunca o espaço
  });

  it("IDOR: ADM_STARTUP não acessa funções administrativas do Espaço de Inovação", async () => {
    const id = await userId("admstartup@dev.hubdigital.local");
    // Tem members.manage na própria startup…
    expect(await hasPermission(id, startupId, "members.manage")).toBe(true);
    // …mas o mesmo código de permissão NÃO vale para outra organização (ID trocado).
    expect(await hasPermission(id, espacoId, "members.manage")).toBe(false);
    expect(await hasPermission(id, espacoId, "users.list")).toBe(false);
    expect(await hasPermission(id, hubId, "registrations.approve")).toBe(false);
  });

  it("permissão concedida por um papel e permissão ausente", async () => {
    const id = await userId("admespaco@dev.hubdigital.local");
    expect(await hasPermission(id, espacoId, "users.create")).toBe(true);
    expect(await hasPermission(id, espacoId, "registrations.approve")).toBe(
      false,
    );
    expect(
      await hasAnyPermission(id, espacoId, [
        "registrations.approve",
        "users.create",
      ]),
    ).toBe(true);
    expect(
      await hasAllPermissions(id, espacoId, [
        "registrations.approve",
        "users.create",
      ]),
    ).toBe(false);
  });

  it("ADM_HUB tem escopo global (vínculo em organização tipo HUB)", async () => {
    const id = await userId("admhub@dev.hubdigital.local");
    expect(await hasPermission(id, espacoId, "users.list")).toBe(true);
    expect(await hasPermission(id, null, "registrations.approve")).toBe(true);
  });

  it("SUPER_ADMIN tem qualquer permissão em qualquer escopo", async () => {
    const id = await userId("superadmin@dev.hubdigital.local");
    expect(await isSuperAdmin(id)).toBe(true);
    expect(await hasPermission(id, startupId, "permissao.inexistente")).toBe(
      true,
    );
    const comum = await userId("comum@dev.hubdigital.local");
    expect(await isSuperAdmin(comum)).toBe(false);
  });

  it("feature flag desabilitada bloqueia módulo mesmo com permissão", async () => {
    const id = await userId("superadmin@dev.hubdigital.local");
    expect(await isFeatureEnabled("coworking")).toBe(false);
    expect(await canAccessModule(id, hubId, "coworking")).toBe(false);
  });

  it("override de flag por organização tem precedência sobre a global", async () => {
    const flag = await prisma.featureFlag.create({
      data: { key: "coworking", enabled: true, organizationId: espacoId },
    });
    try {
      expect(await isFeatureEnabled("coworking", espacoId)).toBe(true);
      expect(await isFeatureEnabled("coworking", startupId)).toBe(false);
      const admEspaco = await userId("admespaco@dev.hubdigital.local");
      expect(await canAccessModule(admEspaco, espacoId, "coworking")).toBe(
        true,
      );
    } finally {
      await prisma.featureFlag.delete({ where: { id: flag.id } });
    }
  });

  it("vínculo inativo e organização inativa deixam de conceder acesso", async () => {
    // Fixtures temporárias — não altera os dados do seed.
    const type = await prisma.organizationType.findUniqueOrThrow({
      where: { code: "STARTUP" },
    });
    const org = await prisma.organization.create({
      data: {
        name: "Org Teste Autorização",
        slug: `org-test-${Date.now()}`,
        typeId: type.id,
        status: "ACTIVE",
      },
    });
    const user = await prisma.user.create({
      data: {
        name: "Teste Autorização",
        email: `authz-${Date.now()}@test.local`,
        status: "ACTIVE",
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: "ADM_STARTUP" },
    });
    const membership = await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, status: "ACTIVE" },
    });
    await prisma.membershipRole.create({
      data: { membershipId: membership.id, roleId: role.id },
    });

    try {
      expect(await hasPermission(user.id, org.id, "members.manage")).toBe(true);

      await prisma.membership.update({
        where: { id: membership.id },
        data: { status: "SUSPENDED" },
      });
      expect(await hasPermission(user.id, org.id, "members.manage")).toBe(
        false,
      );

      await prisma.membership.update({
        where: { id: membership.id },
        data: { status: "ACTIVE" },
      });
      await prisma.organization.update({
        where: { id: org.id },
        data: { status: "SUSPENDED" },
      });
      expect(await hasPermission(user.id, org.id, "members.manage")).toBe(
        false,
      );
    } finally {
      await prisma.membershipRole.deleteMany({
        where: { membershipId: membership.id },
      });
      await prisma.membership.delete({ where: { id: membership.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it("permissão concedida por múltiplos papéis continua única e válida", async () => {
    // Adiciona um segundo papel temporário ao vínculo do multi na startup.
    const id = await userId("multi@dev.hubdigital.local");
    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: { userId: id, organizationId: startupId },
      },
    });
    const extraRole = await prisma.role.findUniqueOrThrow({
      where: { code: "USUARIO_EQUIPE_STARTUP" },
    });
    await prisma.membershipRole.create({
      data: { membershipId: membership.id, roleId: extraRole.id },
    });
    try {
      // plans.view existe em ambos os papéis; members.manage só no ADM_STARTUP.
      expect(await hasPermission(id, startupId, "plans.view")).toBe(true);
      expect(await hasPermission(id, startupId, "members.manage")).toBe(true);
    } finally {
      await prisma.membershipRole.delete({
        where: {
          membershipId_roleId: {
            membershipId: membership.id,
            roleId: extraRole.id,
          },
        },
      });
    }
  });
});
