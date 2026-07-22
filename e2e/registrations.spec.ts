import { expect, test, type Page } from "@playwright/test";
import { USERS, login } from "./helpers";

async function openRequestByText(page: Page, text: string) {
  await page.goto("/app/admin/cadastros?status=PENDING");
  const row = page.getByRole("row").filter({ hasText: text }).first();
  await row.getByRole("link", { name: "Visualizar" }).click();
  await expect(
    page.getByRole("heading", { name: /Solicitação —/ }),
  ).toBeVisible();
}

test.describe("solicitações de cadastro", () => {
  test("ADM_HUB visualiza pendentes, aprova startup e não duplica no reprocesso", async ({
    page,
  }) => {
    await login(page, USERS.admHub);

    await page.goto("/app/admin/cadastros?status=PENDING");
    await expect(page.getByText("Startup Horizonte")).toBeVisible();

    await openRequestByText(page, "Startup Horizonte");
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("button", { name: "Confirmar aprovação" }).click();
    // Sinal determinístico de sucesso: o diálogo só fecha após a action commitar.
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.reload();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
    await expect(page.getByText("Organização criada")).toBeVisible();
    await expect(page.getByText("Startup Horizonte").first()).toBeVisible();
    // Solicitação processada: nenhuma ação disponível (idempotência na UI e no servidor).
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
    await expect(page.getByText("Solicitação já processada")).toBeVisible();
  });

  test("reprovação exige justificativa e registra decisão", async ({
    page,
  }) => {
    await login(page, USERS.admHub);
    await openRequestByText(page, "Espaço Inovação Norte");

    await page.getByRole("button", { name: "Reprovar" }).click();

    // Sem justificativa: validação bloqueia o envio (campo obrigatório com mínimo).
    const confirm = page.getByRole("button", { name: "Confirmar reprovação" });
    await confirm.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page
      .getByLabel("Justificativa")
      .fill("Documentação insuficiente para análise E2E.");
    await confirm.click();
    // Sinal determinístico de sucesso: o diálogo só fecha após a action commitar.
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.reload();
    await expect(page.getByText("Reprovada", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Documentação insuficiente para análise E2E."),
    ).toBeVisible();
  });

  test("autoaprovação é bloqueada na interface", async ({ page }) => {
    await login(page, USERS.superadmin);
    await openRequestByText(page, "Startup do Próprio Admin");
    await expect(
      page.getByText(
        "Esta é a sua própria solicitação: outra pessoa autorizada precisa analisá-la.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
  });

  test("payload inválido bloqueia aprovação mas permite reprovação", async ({
    page,
  }) => {
    await login(page, USERS.admHub);
    await page.goto("/app/admin/cadastros?status=PENDING&type=STARTUP");
    const row = page
      .getByRole("row")
      .filter({ hasText: "Usuário Comum" })
      .filter({ hasText: "—" })
      .first();
    await row.getByRole("link", { name: "Visualizar" }).click();
    await expect(
      page.getByRole("heading", { name: /Solicitação —/ }),
    ).toBeVisible();
    await expect(page.getByText(/formato inválido ou legado/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reprovar" })).toBeEnabled();
  });
});
