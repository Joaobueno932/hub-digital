import { expect, test } from "@playwright/test";
import { USERS, login, loginRaw } from "./helpers";

test.describe("onboarding — redirecionamento pós-login", () => {
  test("sem onboarding é direcionado ao onboarding", async ({ page }) => {
    await loginRaw(page, USERS.onbNone);
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: "Vamos personalizar a sua jornada" }),
    ).toBeVisible();
  });

  test("com rascunho retorna ao onboarding com a opção salva", async ({
    page,
  }) => {
    await loginRaw(page, USERS.onbDraft);
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    // Estágio HAVE_IDEA salvo no seed vem pré-selecionado.
    await expect(
      page.getByRole("radio", { name: "Tenho uma ideia", exact: true }),
    ).toBeChecked();
  });

  test("concluído vai para o painel", async ({ page }) => {
    await loginRaw(page, USERS.onbDone);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
  });
});

test.describe("onboarding — proteção e validação", () => {
  test("usuário não autenticado é redirecionado ao login", async ({ page }) => {
    await page.goto("/app/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });

  test("não é possível continuar sem selecionar uma opção", async ({
    page,
  }) => {
    await loginRaw(page, USERS.onbNone);
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    await expect(
      page.getByRole("button", { name: "Continuar", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Salvar e continuar depois" }),
    ).toBeDisabled();
  });

  test("usuário concluído não altera o estágio pela rota inicial", async ({
    page,
  }) => {
    await login(page, USERS.onbDone);
    await page.goto("/app/onboarding");
    // É levado ao resultado, sem formulário de seleção.
    await expect(page).toHaveURL(/\/app\/onboarding\/concluido$/);
    await expect(page.getByRole("radio")).toHaveCount(0);
  });
});

test.describe("onboarding — fluxo completo", () => {
  test("inicia, salva, retoma após novo login, revisa e finaliza", async ({
    page,
  }) => {
    // 1. Primeiro acesso → onboarding.
    await loginRaw(page, USERS.onbFlow);
    await expect(page).toHaveURL(/\/app\/onboarding$/);

    // 2. Seleciona uma opção e salva rascunho.
    await page
      .getByRole("radio", { name: "Tenho uma ideia e um time", exact: true })
      .check();
    await page
      .getByRole("button", { name: "Salvar e continuar depois" })
      .click();
    await expect(page.getByRole("status")).toContainText("Rascunho salvo");

    // 3. Encerra a sessão.
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/($|login)/);

    // 4. Autentica novamente → retoma no onboarding com a opção salva.
    await loginRaw(page, USERS.onbFlow);
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    await expect(
      page.getByRole("radio", {
        name: "Tenho uma ideia e um time",
        exact: true,
      }),
    ).toBeChecked();

    // 5. Continua para a revisão.
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/onboarding\/revisao$/);
    await expect(page.getByText("Tenho uma ideia e um time")).toBeVisible();

    // 6. Finaliza com confirmação.
    await page.getByRole("button", { name: "Finalizar" }).click();
    await page.getByRole("button", { name: "Confirmar conclusão" }).click();
    await expect(page).toHaveURL(/\/app\/onboarding\/concluido$/);
    await expect(
      page.getByRole("heading", { name: "Perfil inicial concluído" }),
    ).toBeVisible();

    // 7. Painel mostra o estágio selecionado.
    await page.goto("/app");
    await expect(page.getByText("Tenho uma ideia e um time")).toBeVisible();

    // 8. Segundo login já vai direto ao painel (concluído).
    await page.getByRole("button", { name: "Sair" }).click();
    await loginRaw(page, USERS.onbFlow);
    await expect(page).toHaveURL(/\/app$/);
  });

  test("fluxo funciona em viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginRaw(page, USERS.onbNone);
    await expect(page).toHaveURL(/\/app\/onboarding$/);
    await page
      .getByRole("radio", { name: "Quero iniciar", exact: true })
      .check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/onboarding\/revisao$/);
    await expect(page.getByText("Quero iniciar")).toBeVisible();
  });
});
