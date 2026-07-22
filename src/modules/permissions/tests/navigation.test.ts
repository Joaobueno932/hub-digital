import { describe, expect, it } from "vitest";
import {
  filterNavigation,
  buildNavigation,
  type NavContext,
} from "../services/navigation";
import { NAV_ITEMS } from "@/config/navigation";

function ctx(overrides: Partial<NavContext> = {}): NavContext {
  return {
    isAuthenticated: true,
    superAdmin: false,
    permissionCodes: new Set(),
    globalPermissionCodes: new Set(),
    activeOrganizationType: null,
    hasActiveOrganization: false,
    enabledFlags: new Set(),
    ...overrides,
  };
}

describe("filterNavigation", () => {
  it("não autenticado não recebe itens", () => {
    expect(
      filterNavigation(NAV_ITEMS, ctx({ isAuthenticated: false })),
    ).toEqual([]);
  });

  it("usuário sem vínculo vê apenas itens sem organização/permissão", () => {
    const items = filterNavigation(
      NAV_ITEMS,
      ctx({ permissionCodes: new Set(["plans.view", "dashboard.view"]) }),
    );
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/app");
    expect(hrefs).toContain("/app/planos");
    expect(hrefs).toContain("/app/configuracoes");
    expect(hrefs).not.toContain("/app/minha-organizacao");
    expect(hrefs).not.toContain("/app/membros");
    expect(hrefs).not.toContain("/app/admin");
  });

  it("módulos futuros não aparecem com flag desabilitada, mesmo com permissão", () => {
    const items = filterNavigation(
      NAV_ITEMS,
      ctx({
        hasActiveOrganization: true,
        activeOrganizationType: "STARTUP",
        permissionCodes: new Set(["members.manage", "plans.view"]),
      }),
    );
    const hrefs = items.map((i) => i.href);
    for (const future of [
      "/app/coworking",
      "/app/eventos",
      "/app/ideacao",
      "/app/projetos",
      "/app/tendencias",
      "/app/relatorios",
      "/app/academy",
    ]) {
      expect(hrefs).not.toContain(future);
    }
  });

  it("flag habilitada revela o módulo", () => {
    const items = filterNavigation(
      NAV_ITEMS,
      ctx({
        hasActiveOrganization: true,
        enabledFlags: new Set(["coworking"]),
      }),
    );
    expect(items.map((i) => i.href)).toContain("/app/coworking");
  });

  it("restrição por tipo de organização é aplicada", () => {
    const base = {
      hasActiveOrganization: true,
      enabledFlags: new Set(["evolution"]),
    };
    const startup = filterNavigation(
      NAV_ITEMS,
      ctx({ ...base, activeOrganizationType: "STARTUP" }),
    );
    const espaco = filterNavigation(
      NAV_ITEMS,
      ctx({ ...base, activeOrganizationType: "ESPACO_INOVACAO" }),
    );
    expect(startup.map((i) => i.href)).toContain("/app/evolucao");
    expect(espaco.map((i) => i.href)).not.toContain("/app/evolucao");
  });

  it("menus diferem entre ADM_HUB e ADM_STARTUP", () => {
    // ADM_HUB tem vínculo em organização HUB, então as permissões dele são de
    // escopo global (globalPermissionCodes).
    const admHubCodes = new Set([
      "users.list",
      "registrations.list",
      "members.manage",
      "plans.view",
    ]);
    const admHub = filterNavigation(
      NAV_ITEMS,
      ctx({
        hasActiveOrganization: true,
        activeOrganizationType: "HUB",
        permissionCodes: admHubCodes,
        globalPermissionCodes: admHubCodes,
      }),
    );
    const admStartup = filterNavigation(
      NAV_ITEMS,
      ctx({
        hasActiveOrganization: true,
        activeOrganizationType: "STARTUP",
        permissionCodes: new Set(["members.manage", "plans.view"]),
      }),
    );
    expect(admHub.map((i) => i.href)).toContain("/app/admin");
    expect(admStartup.map((i) => i.href)).not.toContain("/app/admin");
    expect(admStartup.map((i) => i.href)).toContain("/app/membros");
  });

  it("permissão de administração concedida apenas dentro da organização não revela /app/admin", () => {
    // Regressão: ADM_ESPACO_INOVACAO tinha `users.list` no escopo do próprio
    // espaço e, por isso, enxergava a administração da plataforma.
    const items = filterNavigation(
      NAV_ITEMS,
      ctx({
        hasActiveOrganization: true,
        activeOrganizationType: "ESPACO_INOVACAO",
        permissionCodes: new Set(["users.list", "members.manage"]),
        globalPermissionCodes: new Set(), // nada em escopo global
      }),
    );
    const hrefs = items.map((i) => i.href);
    expect(hrefs).not.toContain("/app/admin");
    expect(hrefs).toContain("/app/membros"); // a área correta continua visível
  });

  it("SUPER_ADMIN vê itens de administração sem depender de flags de permissão", () => {
    const items = filterNavigation(
      NAV_ITEMS,
      ctx({ superAdmin: true, hasActiveOrganization: true }),
    );
    expect(items.map((i) => i.href)).toContain("/app/admin");
  });

  it("buildNavigation agrupa e descarta grupos vazios", () => {
    const groups = buildNavigation(
      ctx({ permissionCodes: new Set(["plans.view"]) }),
    );
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    expect(groups.map((g) => g.group)).not.toContain("administracao");
  });
});
