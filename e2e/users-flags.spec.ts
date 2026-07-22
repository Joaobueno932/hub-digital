import { expect, test, type Page } from "@playwright/test";
import { USERS, login, loginRaw } from "./helpers";

/**
 * A suíte compartilha o banco E2E e roda com `workers: 1`, então todo teste
 * que altera uma flag GLOBAL restaura o estado antes de terminar — senão
 * contamina os demais.
 */
async function setGlobalFlag(page: Page, name: string, enable: boolean) {
  await page.goto("/app/admin/feature-flags");
  const row = page.getByRole("row").filter({ hasText: name });

  // Espera a linha renderizar ANTES de decidir: um `count()` logo após o
  // goto pode retornar 0 e faria o helper pular o clique silenciosamente,
  // deixando a flag no estado errado.
  await row
    .getByRole("button", { name: /global$/ })
    .first()
    .waitFor();

  const toggle = row.getByRole("button", {
    name: enable ? "Habilitar global" : "Desabilitar global",
  });
  if ((await toggle.count()) === 0) return; // já está no estado desejado

  await toggle.first().click();

  // Confirma pelo ESTADO (o botão inverte), não pela mensagem de sucesso: a
  // action revalida o layout, o painel remonta e o texto do useActionState
  // se perde.
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: name })
      .getByRole("button", {
        name: enable ? "Desabilitar global" : "Habilitar global",
      })
      .first(),
    // A action revalida o layout inteiro (`revalidatePath("/app","layout")`),
    // o que pode passar dos 5s padrão no build de produção.
  ).toBeVisible({ timeout: 20000 });
}

test.describe("administração de usuários", () => {
  test("SUPER_ADMIN lista, busca e filtra usuários", async ({ page }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();

    await page.getByLabel("Buscar por nome ou e-mail").fill("conta.suspensa");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(
      page.getByText("conta.suspensa@dev.hubdigital.local").first(),
    ).toBeVisible();

    await page.goto("/app/admin/usuarios?status=SUSPENDED");
    await expect(
      page.getByText("conta.suspensa@dev.hubdigital.local").first(),
    ).toBeVisible();
  });

  test("perfil comum não acessa a administração de usuários", async ({
    page,
  }) => {
    await login(page, USERS.comum);
    await page.goto("/app/admin/usuarios");
    await expect(page).toHaveURL(/\/app\/acesso-negado/);
  });

  test("detalhe mostra vínculos e mantém e-mail somente leitura", async ({
    page,
  }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/usuarios?q=admstartup");
    await page.getByRole("link", { name: "Ver" }).first().click();

    await expect(page.getByText("Vínculos e papéis")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("readonly", "");
  });

  test("suspende, bloqueia o login e reativa", async ({ page, context }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/usuarios?q=equipestartup");
    await page.getByRole("link", { name: "Ver" }).first().click();

    await page.getByRole("button", { name: "Suspender conta" }).click();
    await page
      .getByLabel("Motivo")
      .fill("Suspensão automatizada durante os testes E2E.");
    await page.getByRole("button", { name: "Confirmar suspensão" }).click();
    // Estado resultante: a conta passa a oferecer "Reativar".
    await expect(
      page.getByRole("button", { name: "Reativar conta" }),
    ).toBeVisible();

    // O login do usuário suspenso é recusado.
    const other = await context.newPage();
    await loginRaw(other, USERS.equipeStartup);
    await expect(other.getByText("E-mail ou senha inválidos.")).toBeVisible();
    await other.close();

    // Reativa e confirma que o acesso volta.
    await page.reload();
    await page.getByRole("button", { name: "Reativar conta" }).click();
    await page.getByRole("button", { name: "Confirmar reativação" }).click();
    await expect(
      page.getByRole("button", { name: "Suspender conta" }),
    ).toBeVisible();

    const back = await context.newPage();
    await login(back, USERS.equipeStartup);
    await back.close();
  });

  test("auto-suspensão fica indisponível na própria conta", async ({
    page,
  }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/usuarios?q=superadmin@");
    await page.getByRole("link", { name: "Ver" }).first().click();

    await expect(page.getByText("Esta é a sua própria conta")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Suspender conta" }),
    ).toHaveCount(0);
  });

  test("ADM_HUB não administra um SUPER_ADMIN", async ({ page }) => {
    await login(page, USERS.admHub);
    await page.goto("/app/admin/usuarios?q=superadmin@");
    await page.getByRole("link", { name: "Ver" }).first().click();

    await expect(
      page.getByText(
        "Apenas um super administrador pode administrar esta conta.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Suspender conta" }),
    ).toHaveCount(0);
  });
});

test.describe("feature flags", () => {
  test("SUPER_ADMIN lista as flags do catálogo", async ({ page }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/feature-flags");
    await expect(
      page.getByRole("heading", { name: "Feature flags" }),
    ).toBeVisible();
    await expect(page.getByText("Coworking").first()).toBeVisible();
    await expect(page.getByText("Pagamentos").first()).toBeVisible();
  });

  test("ADM_HUB não altera payments nem integrações externas", async ({
    page,
  }) => {
    await login(page, USERS.admHub);
    await page.goto("/app/admin/feature-flags");
    const paymentsRow = page.getByRole("row").filter({ hasText: "Pagamentos" });
    await expect(
      paymentsRow.getByText("Somente super administrador"),
    ).toBeVisible();
  });

  test("flag habilitada revela o módulo no menu e libera a rota", async ({
    page,
  }) => {
    // `agenda` está habilitada globalmente no seed e SUPER_ADMIN atua no Hub,
    // que não tem override — então o módulo está disponível para ele.
    await login(page, USERS.superadmin);
    await expect(
      page
        .getByRole("navigation", { name: "Menu interno" })
        .first()
        .getByRole("link", { name: "Agenda" }),
    ).toBeVisible();

    await page.goto("/app/agenda");
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  });

  test("flag desabilitada some do menu e bloqueia a rota", async ({ page }) => {
    // Mesma flag `agenda`, mas a Startup Demo Aurora tem override DESLIGADO:
    // o item some do menu e a rota passa a ser bloqueada no servidor.
    await login(page, USERS.admStartup);
    await expect(
      page
        .getByRole("navigation", { name: "Menu interno" })
        .first()
        .getByRole("link", { name: "Agenda" }),
    ).toHaveCount(0);

    await page.goto("/app/agenda");
    await expect(page).toHaveURL(/\/app\/modulo-indisponivel/);
  });

  test("alteração global é persistida e refletida na administração", async ({
    page,
  }) => {
    await login(page, USERS.superadmin);
    try {
      await setGlobalFlag(page, "Academy", true);
      const row = page.getByRole("row").filter({ hasText: "Academy" });
      await expect(row.getByText("Habilitado").first()).toBeVisible();
    } finally {
      await setGlobalFlag(page, "Academy", false);
    }
  });

  test("override da organização prevalece sobre o valor global", async ({
    page,
    context,
  }) => {
    // Cenário vindo do seed, sem alterar nada: `agenda` está LIGADA
    // globalmente com override DESLIGADO para a Startup Demo Aurora, e
    // `connections` está DESLIGADA globalmente com override LIGADO para a
    // mesma organização. Verificar pelo menu prova a precedência de ponta a
    // ponta, sem contaminar o estado global para os outros testes.
    await login(page, USERS.admHub);
    const hubNav = page
      .getByRole("navigation", { name: "Menu interno" })
      .first();
    // Hub não tem override: segue o global.
    await expect(hubNav.getByRole("link", { name: "Agenda" })).toBeVisible();
    await expect(hubNav.getByRole("link", { name: "Conexões" })).toHaveCount(0);

    const startupPage = await context.newPage();
    await login(startupPage, USERS.admStartup);
    const startupNav = startupPage
      .getByRole("navigation", { name: "Menu interno" })
      .first();
    // Override desliga a Agenda e liga as Conexões só nesta organização.
    await expect(startupNav.getByRole("link", { name: "Agenda" })).toHaveCount(
      0,
    );
    await expect(
      startupNav.getByRole("link", { name: "Conexões" }),
    ).toBeVisible();
    await startupPage.close();
  });

  test("a administração mostra o override e sua origem", async ({ page }) => {
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/feature-flags");
    await page
      .getByLabel("Ver overrides da organização")
      .selectOption({ label: "Startup Demo Aurora" });
    await page.getByRole("button", { name: "Aplicar" }).click();

    const row = page.getByRole("row").filter({ hasText: "Agenda" });
    await row.getByText("Organização").first().waitFor();
    // Global habilitada, override desabilitado, efetivo desabilitado.
    await expect(row.getByText("Organização").first()).toBeVisible();

    const semOverride = page
      .getByRole("row")
      .filter({ hasText: "Coworking" })
      .getByText("Sem override");
    await expect(semOverride.first()).toBeVisible();
  });

  test("acesso direto à rota é bloqueado com a flag desabilitada", async ({
    page,
  }) => {
    await login(page, USERS.admStartup);
    for (const route of ["/app/coworking", "/app/eventos", "/app/projetos"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/app\/modulo-indisponivel/);
    }
  });
});

test.describe("fluxo mobile", () => {
  test("administração de usuários funciona em viewport mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, USERS.superadmin);
    await page.goto("/app/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
    // Em telas pequenas a tabela dá lugar a cards.
    await expect(page.locator("table.hidden")).toBeHidden();
  });
});
