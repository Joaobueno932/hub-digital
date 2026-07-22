import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const DEV_PASSWORD = "HubDigital@dev1";

export const USERS = {
  superadmin: "superadmin@dev.hubdigital.local",
  admHub: "admhub@dev.hubdigital.local",
  admStartup: "admstartup@dev.hubdigital.local",
  multi: "multi@dev.hubdigital.local",
  comum: "comum@dev.hubdigital.local",
  onbNone: "onb.none@dev.hubdigital.local",
  onbFlow: "onb.flow@dev.hubdigital.local",
  onbDraft: "onb.draft@dev.hubdigital.local",
  onbDone: "onb.done@dev.hubdigital.local",
} as const;

/** Login que apenas submete e aguarda sair da página de login (destino varia). */
export async function loginRaw(
  page: Page,
  email: string,
  password: string = DEV_PASSWORD,
) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Login de usuário com onboarding concluído (destino: dentro de /app). */
export async function login(
  page: Page,
  email: string,
  password: string = DEV_PASSWORD,
) {
  await loginRaw(page, email, password);
  await expect(page).toHaveURL(/\/app/);
}
