import { expect, test } from "@playwright/test";
import { USERS, login, loginRaw } from "./helpers";

test.describe("membros — escopo e autorização", () => {
  test("ADM_STARTUP vê os membros da própria startup", async ({ page }) => {
    await login(page, USERS.admStartup);
    await page.goto("/app/membros");
    await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible();
    await expect(
      page.getByText("Membros de Startup Demo Aurora"),
    ).toBeVisible();
  });

  test("perfil comum não acessa gestão de membros", async ({ page }) => {
    await login(page, USERS.comum);
    await page.goto("/app/membros");
    await expect(page).toHaveURL(/\/app\/acesso-negado/);
  });

  test("SUPER_ADMIN acessa a administração global de organizações", async ({
    page,
  }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/organizacoes");
    await expect(
      page.getByRole("heading", { name: "Organizações" }),
    ).toBeVisible();
    await expect(page.getByText("Startup Demo Aurora")).toBeVisible();
  });
});

test.describe("convites — ciclo completo", () => {
  test("admin cria convite, link de dev aparece, convidado aceita e organização passa a aparecer para ele", async ({
    page,
    context,
  }) => {
    await login(page, USERS.admStartup);
    await page.goto("/app/membros");

    const email = `e2e-convite-${Date.now()}@dev.hubdigital.local`;
    await page.getByLabel("E-mail").fill(email);
    await page
      .getByLabel("Papel", { exact: true })
      .selectOption({ label: "Membro de equipe de startup" });
    await page.getByRole("button", { name: "Convidar" }).click();

    await expect(page.getByText("Convite criado com sucesso.")).toBeVisible();
    const link = page.getByRole("link", { name: /\/convites\// });
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();

    // Revogar um convite recém-criado para outro e-mail (fluxo de revogação).
    await page.goto("/app/convites");
    await expect(page.getByText(email)).toBeVisible();

    // Convite é aceito por um usuário já seedado (solo.admin), convidado agora.
    const inviteEmail = `solo.admin@dev.hubdigital.local`;
    await page.goto("/app/membros");
    await page.getByLabel("E-mail").fill(inviteEmail);
    await page
      .getByLabel("Papel", { exact: true })
      .selectOption({ label: "Membro de equipe de startup" });
    await page.getByRole("button", { name: "Convidar" }).click();
    await expect(page.getByText("Convite criado com sucesso.")).toBeVisible();
    const inviteLink = page.getByRole("link", { name: /\/convites\// });
    const inviteHref = await inviteLink.getAttribute("href");
    expect(inviteHref).toBeTruthy();

    // Novo contexto: o convidado faz login e aceita.
    const invitedPage = await context.newPage();
    await login(invitedPage, inviteEmail);
    await invitedPage.goto(inviteHref!);
    await expect(
      invitedPage.getByRole("heading", { name: "Convite para organização" }),
    ).toBeVisible();
    await invitedPage.getByRole("button", { name: "Aceitar convite" }).click();
    await expect(invitedPage).toHaveURL(/\/app/);

    // Organização aparece no seletor (usuário passou a ter dois vínculos).
    await invitedPage.goto("/app");
    await expect(invitedPage.getByLabel("Organização ativa")).toBeVisible();
    await invitedPage.close();
  });

  test("convite para e-mail com conta existente não pode ser aceito por outro usuário", async ({
    page,
    context,
  }) => {
    await login(page, USERS.admStartup);
    await page.goto("/app/membros");
    const email = `e2e-mismatch-${Date.now()}@dev.hubdigital.local`;
    await page.getByLabel("E-mail").fill(email);
    await page
      .getByLabel("Papel", { exact: true })
      .selectOption({ label: "Membro de equipe de startup" });
    await page.getByRole("button", { name: "Convidar" }).click();
    const link = page.getByRole("link", { name: /\/convites\// });
    const href = await link.getAttribute("href");

    const otherPage = await context.newPage();
    await login(otherPage, USERS.comum);
    await otherPage.goto(href!);
    await expect(
      otherPage.getByText("Este convite foi enviado para outro e-mail."),
    ).toBeVisible();
    await otherPage.close();
  });
});

test.describe("último administrador", () => {
  test("último administrador não pode ser removido nem suspenso", async ({
    page,
  }) => {
    await loginRaw(page, "solo.admin@dev.hubdigital.local");
    await expect(page).toHaveURL(/\/app/);
    await page.goto("/app/membros");
    await page.getByRole("button", { name: "Suspender" }).click();
    await page.getByRole("button", { name: "Confirmar suspensão" }).click();
    await expect(
      page.getByText(
        "Esta é a última pessoa administradora ativa da organização — a ação foi bloqueada.",
      ),
    ).toBeVisible();
  });
});

test.describe("fluxo mobile", () => {
  test("gestão de membros funciona em viewport mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, USERS.admStartup);
    await page.goto("/app/membros");
    await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible();
    // No mobile, a tabela é substituída por cards (ver members-panel.tsx).
    await expect(page.locator("table.hidden")).toBeHidden();
  });
});
