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
