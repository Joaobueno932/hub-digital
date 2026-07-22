import { expect, test, type Page } from "@playwright/test";
import { USERS, login } from "./helpers";

// Seletores por id (não ambíguos) — cada campo tem id estável.
async function fillStartup(page: Page, name: string) {
  await page.locator("#startupName").fill(name);
  await page
    .locator("#description")
    .fill("Startup de demonstração para o teste E2E.");
  await page.locator("#stage").selectOption("HAVE_IDEA");
  await page.locator("#city").fill("Campo Grande");
  await page.locator("#state").selectOption("MS");
  await page.locator("#acceptedTerms").check();
  await page.locator("#acceptedPrivacy").check();
}

async function fillSpace(page: Page, name: string) {
  await page.locator("#spaceName").fill(name);
  await page
    .locator("#description")
    .fill("Espaço de inovação de demonstração E2E.");
  await page.locator("#city").fill("Dourados");
  await page.locator("#state").selectOption("MS");
  await page.locator("#acceptedTerms").check();
  await page.locator("#acceptedPrivacy").check();
}

async function logout(page: Page) {
  // Garante estar numa página do app (com o cabeçalho e o botão "Sair").
  await page.goto("/app");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/($|login)/);
}

test.describe("solicitações institucionais — startup", () => {
  test("envia, acompanha, e o admin aprova criando organização e vínculo", async ({
    page,
  }) => {
    await login(page, USERS.reqStartupNew);

    await page.goto("/cadastro/startup");
    await expect(
      page.getByRole("heading", { name: "Solicitar cadastro de startup" }),
    ).toBeVisible();

    // Campo obrigatório: submissão vazia não avança.
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page).toHaveURL(/\/cadastro\/startup$/);

    await fillStartup(page, "Startup E2E Aurora");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page).toHaveURL(/\/cadastro\/enviado$/);
    await expect(
      page.getByRole("heading", { name: "Solicitação recebida" }),
    ).toBeVisible();

    // Aparece em Minhas solicitações como pendente.
    await page.goto("/app/minhas-solicitacoes");
    await expect(
      page.getByRole("cell", { name: "Startup", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pendente", { exact: true })).toBeVisible();

    // Admin aprova.
    await logout(page);
    await login(page, USERS.admHub);
    await page.goto("/app/admin/cadastros?status=PENDING&type=STARTUP");
    await page
      .getByRole("row")
      .filter({ hasText: "Startup E2E Aurora" })
      .getByRole("link", { name: "Visualizar" })
      .click();
    await expect(page.getByText("Campo Grande / MS")).toBeVisible();
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("button", { name: "Confirmar aprovação" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
    await expect(page.getByText("Organização criada")).toBeVisible();
  });
});

test.describe("solicitações institucionais — espaço", () => {
  test("envia, admin reprova com justificativa e o solicitante a vê", async ({
    page,
  }) => {
    await login(page, USERS.reqEspacoNew);
    await page.goto("/cadastro/espaco-inovacao");
    await fillSpace(page, "Espaço E2E Norte");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page).toHaveURL(/\/cadastro\/enviado$/);

    await logout(page);
    await login(page, USERS.admHub);
    await page.goto("/app/admin/cadastros?status=PENDING&type=ESPACO_INOVACAO");
    await page
      .getByRole("row")
      .filter({ hasText: "Espaço E2E Norte" })
      .getByRole("link", { name: "Visualizar" })
      .click();
    await page.getByRole("button", { name: "Reprovar" }).click();
    await page
      .getByLabel("Justificativa")
      .fill("Documentação insuficiente (teste E2E).");
    await page.getByRole("button", { name: "Confirmar reprovação" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await logout(page);
    await login(page, USERS.reqEspacoNew);
    await page.goto("/app/minhas-solicitacoes");
    await expect(page.getByText("Reprovada", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Documentação insuficiente \(teste E2E\)/),
    ).toBeVisible();
  });
});

test.describe("solicitações institucionais — segurança", () => {
  test("nova submissão PENDING do mesmo tipo é bloqueada", async ({ page }) => {
    await login(page, USERS.reqPending); // já possui uma startup PENDING no seed
    await page.goto("/cadastro/startup");
    await fillStartup(page, "Startup Duplicada");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page).toHaveURL(/\/cadastro\/startup$/);
    await expect(page.getByText(/em análise/)).toBeVisible();
  });

  test("usuário vê apenas as próprias solicitações", async ({ page }) => {
    await login(page, USERS.reqPending);
    await page.goto("/app/minhas-solicitacoes");
    // Seed: exatamente 2 solicitações (startup + espaço), nenhuma de terceiros.
    await expect(
      page.getByRole("row").filter({ hasText: /Pendente/ }),
    ).toHaveCount(2);
  });

  test("perfil sem permissão não acessa a administração de cadastros", async ({
    page,
  }) => {
    await login(page, USERS.reqPending);
    await page.goto("/app/admin/cadastros");
    await expect(page).toHaveURL(/\/app\/acesso-negado/);
  });

  test("honeypot preenchido impede o envio", async ({ page }) => {
    await login(page, USERS.reqMobile);
    await page.goto("/cadastro/startup");
    await fillStartup(page, "Startup Honeypot");
    await page
      .locator("#companyWebsite")
      .fill("http://bot.example", { force: true });
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    // Rejeitado (client + server): permanece no formulário, não cria solicitação.
    await expect(page).toHaveURL(/\/cadastro\/startup$/);
  });

  test("fluxo funciona em viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, USERS.reqMobile);
    await page.goto("/cadastro/startup");
    await fillStartup(page, "Startup Mobile");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page).toHaveURL(/\/cadastro\/enviado$/);
  });
});
