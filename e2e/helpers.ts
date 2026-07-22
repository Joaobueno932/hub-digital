import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const DEV_PASSWORD = "HubDigital@dev1";

export const USERS = {
  superadmin: "superadmin@dev.hubdigital.local",
  admHub: "admhub@dev.hubdigital.local",
  admStartup: "admstartup@dev.hubdigital.local",
  admEspaco: "admespaco@dev.hubdigital.local",
  equipeStartup: "equipestartup@dev.hubdigital.local",
  contaSuspensa: "conta.suspensa@dev.hubdigital.local",
  multi: "multi@dev.hubdigital.local",
  comum: "comum@dev.hubdigital.local",
  onbNone: "onb.none@dev.hubdigital.local",
  onbFlow: "onb.flow@dev.hubdigital.local",
  onbDraft: "onb.draft@dev.hubdigital.local",
  onbDone: "onb.done@dev.hubdigital.local",
  reqStartupNew: "req.startup.new@dev.hubdigital.local",
  reqEspacoNew: "req.espaco.new@dev.hubdigital.local",
  reqPending: "req.pending@dev.hubdigital.local",
  reqMobile: "req.mobile@dev.hubdigital.local",
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
  // A navegação pós-login é client-side (`router.push` + `router.refresh`) e
  // `toHaveURL` resolve assim que a URL muda — com a navegação ainda em voo,
  // um `page.goto()` imediato a cancela e o Chromium reporta
  // net::ERR_ABORTED. Esperar o shell autenticado renderizar garante que a
  // navegação terminou. (`networkidle` não serve: o prefetch de RSC do Next
  // mantém a rede ocupada e o estado nunca é atingido.)
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
}
