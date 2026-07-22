/**
 * Testes de integração do escopo GLOBAL de permissões (PostgreSQL real).
 *
 * Regressão de segurança: papéis organizacionais (ADM_ESPACO_INOVACAO,
 * ADM_STARTUP) não podem administrar usuários da plataforma. A administração
 * das pessoas da própria organização acontece em /app/membros via
 * `members.manage` — ver docs/matriz-permissoes.md.
 *
 * Pré-requisitos: `docker compose up -d`, migrations e seed aplicados.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getAccessContext,
  globalPermissions,
  hasPermission,
} from "../services/authorization";

async function accessOf(email: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return getAccessContext(user.id);
}

/** Espelha `globalPermissionInContext` de src/lib/authz.ts. */
function hasGlobalScope(
  access: Awaited<ReturnType<typeof getAccessContext>>,
  code: string,
): boolean {
  return access.superAdmin || access.global.has(code);
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("escopo global de permissões", () => {
  it("SUPER_ADMIN tem escopo global para administração de usuários", async () => {
    const access = await accessOf("superadmin@dev.hubdigital.local");
    expect(access.superAdmin).toBe(true);
    expect(hasGlobalScope(access, "users.list")).toBe(true);
    expect(hasGlobalScope(access, "users.view")).toBe(true);
  });

  it("ADM_HUB tem escopo global porque o vínculo é em organização HUB", async () => {
    const access = await accessOf("admhub@dev.hubdigital.local");
    expect(access.superAdmin).toBe(false);
    expect(hasGlobalScope(access, "users.list")).toBe(true);
    expect(hasGlobalScope(access, "registrations.list")).toBe(true);
  });

  it("ADM_ESPACO_INOVACAO não tem nenhuma permissão de escopo global", async () => {
    const access = await accessOf("admespaco@dev.hubdigital.local");
    expect(access.superAdmin).toBe(false);
    expect(globalPermissions(access.memberships).size).toBe(0);
    expect(hasGlobalScope(access, "users.list")).toBe(false);
    expect(hasGlobalScope(access, "users.view")).toBe(false);
  });

  it("ADM_STARTUP não tem nenhuma permissão de escopo global", async () => {
    const access = await accessOf("admstartup@dev.hubdigital.local");
    expect(access.superAdmin).toBe(false);
    expect(globalPermissions(access.memberships).size).toBe(0);
    expect(hasGlobalScope(access, "users.list")).toBe(false);
    expect(hasGlobalScope(access, "users.view")).toBe(false);
  });

  it("papéis organizacionais não recebem mais users.* nem no escopo da própria organização", async () => {
    const espaco = await prisma.organization.findUniqueOrThrow({
      where: { slug: "espaco-inovacao-centro" },
    });
    const startup = await prisma.organization.findUniqueOrThrow({
      where: { slug: "startup-aurora" },
    });
    const admEspaco = await prisma.user.findUniqueOrThrow({
      where: { email: "admespaco@dev.hubdigital.local" },
    });
    const admStartup = await prisma.user.findUniqueOrThrow({
      where: { email: "admstartup@dev.hubdigital.local" },
    });

    for (const code of [
      "users.list",
      "users.view",
      "users.create",
      "users.update",
      "users.deactivate",
    ]) {
      expect(await hasPermission(admEspaco.id, espaco.id, code)).toBe(false);
      expect(await hasPermission(admStartup.id, startup.id, code)).toBe(false);
    }
  });

  it("a administração das próprias pessoas continua disponível via members.manage", async () => {
    const espaco = await prisma.organization.findUniqueOrThrow({
      where: { slug: "espaco-inovacao-centro" },
    });
    const startup = await prisma.organization.findUniqueOrThrow({
      where: { slug: "startup-aurora" },
    });
    const admEspaco = await prisma.user.findUniqueOrThrow({
      where: { email: "admespaco@dev.hubdigital.local" },
    });
    const admStartup = await prisma.user.findUniqueOrThrow({
      where: { email: "admstartup@dev.hubdigital.local" },
    });

    expect(await hasPermission(admEspaco.id, espaco.id, "members.manage")).toBe(
      true,
    );
    expect(
      await hasPermission(admStartup.id, startup.id, "members.manage"),
    ).toBe(true);
  });

  it("members.manage não vaza para outra organização (anti-IDOR)", async () => {
    const espaco = await prisma.organization.findUniqueOrThrow({
      where: { slug: "espaco-inovacao-centro" },
    });
    const admStartup = await prisma.user.findUniqueOrThrow({
      where: { email: "admstartup@dev.hubdigital.local" },
    });
    expect(
      await hasPermission(admStartup.id, espaco.id, "members.manage"),
    ).toBe(false);
  });
});
