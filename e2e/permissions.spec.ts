import { expect, test } from "@playwright/test";
import { USERS, login } from "./helpers";

test.describe("permissões e menu", () => {
  test("ADM_STARTUP não acessa /app/admin/cadastros e não vê menu administrativo", async ({
    page,
  }) => {
    await login(page, USERS.admStartup);
    await expect(
      page.getByRole("navigation", { name: "Menu interno" }).getByRole("link", {
        name: "Administração",
      }),
    ).toHaveCount(0);

    await page.goto("/app/admin/cadastros");
    await expect(page).toHaveURL(/\/app\/acesso-negado/);
    await expect(
      page.getByRole("heading", { name: "Acesso negado" }),
    ).toBeVisible();
  });

  test("ADM_HUB acessa a listagem e vê o menu administrativo", async ({
    page,
  }) => {
    await login(page, USERS.admHub);
    await expect(
      page.getByRole("navigation", { name: "Menu interno" }).getByRole("link", {
        name: "Administração",
      }),
    ).toBeVisible();

    await page.goto("/app/admin/cadastros");
    await expect(
      page.getByRole("heading", { name: "Solicitações de cadastro" }),
    ).toBeVisible();
  });
});

/**
 * Regressão de segurança: papéis organizacionais tinham `users.*` no escopo da
 * própria organização e, por isso, abriam a administração de usuários da
 * plataforma — enxergando pessoas de outras organizações.
 */
test.describe("administração de usuários é restrita ao escopo global", () => {
  for (const perfil of [
    { nome: "ADM_ESPACO_INOVACAO", email: USERS.admEspaco },
    { nome: "ADM_STARTUP", email: USERS.admStartup },
  ]) {
    test(`${perfil.nome} não acessa /app/admin/usuarios nem vê o menu`, async ({
      page,
    }) => {
      await login(page, perfil.email);

      await expect(
        page
          .getByRole("navigation", { name: "Menu interno" })
          .getByRole("link", {
            name: "Administração",
          }),
      ).toHaveCount(0);

      await page.goto("/app/admin/usuarios");
      await expect(page).toHaveURL(/\/app\/acesso-negado/);

      // O hub administrativo também é negado (não deve listar cards).
      await page.goto("/app/admin");
      await expect(page).toHaveURL(/\/app\/acesso-negado/);
    });

    test(`${perfil.nome} continua administrando as próprias pessoas em /app/membros`, async ({
      page,
    }) => {
      await login(page, perfil.email);
      await page.goto("/app/membros");
      await expect(
        page.getByRole("heading", { name: "Membros" }),
      ).toBeVisible();
    });
  }

  test("perfil comum não acessa a administração de usuários", async ({
    page,
  }) => {
    await login(page, USERS.comum);
    await page.goto("/app/admin/usuarios");
    await expect(page).toHaveURL(/\/app\/acesso-negado/);
  });

  for (const perfil of [
    { nome: "SUPER_ADMIN", email: USERS.superadmin },
    { nome: "ADM_HUB", email: USERS.admHub },
  ]) {
    test(`${perfil.nome} mantém o acesso à administração de usuários`, async ({
      page,
    }) => {
      await login(page, perfil.email);
      await page.goto("/app/admin/usuarios");
      await expect(
        page.getByRole("heading", { name: "Usuários" }),
      ).toBeVisible();
      // Vê pessoas de organizações distintas — é uma visão de plataforma.
      await expect(
        page.getByText("admstartup@dev.hubdigital.local"),
      ).toBeVisible();
      await expect(
        page.getByText("admespaco@dev.hubdigital.local"),
      ).toBeVisible();
    });
  }
});
