import { expect, test } from "@playwright/test";
import { DEV_PASSWORD, USERS, login } from "./helpers";

test.describe("autenticação", () => {
  test("usuário sem sessão é redirecionado para o login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login válido abre o dashboard", async ({ page }) => {
    await login(page, USERS.comum);
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
  });

  test("login inválido exibe mensagem genérica", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(USERS.comum);
    await page.getByLabel("Senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout encerra a sessão", async ({ page }) => {
    await login(page, USERS.comum, DEV_PASSWORD);
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/($|login)/);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });
});
