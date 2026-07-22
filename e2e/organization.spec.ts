import { expect, test } from "@playwright/test";
import { USERS, login } from "./helpers";

test.describe("organização ativa", () => {
  test("usuário multi-organização troca a organização ativa", async ({
    page,
  }) => {
    await login(page, USERS.multi);
    const select = page.getByLabel("Organização ativa");
    await expect(select).toBeVisible();

    await select.selectOption({ label: "Startup Demo Aurora — Startup" });
    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByText("Você está atuando em Startup Demo Aurora."),
    ).toBeVisible();

    await select.selectOption({
      label: "Espaço de Inovação Centro — Espaço de Inovação",
    });
    await expect(
      page.getByText("Você está atuando em Espaço de Inovação Centro."),
    ).toBeVisible();
  });

  test("usuário com um único vínculo não tem seletor e não seleciona org alheia", async ({
    page,
  }) => {
    await login(page, USERS.admStartup);
    await expect(page.getByLabel("Organização ativa")).toHaveCount(0);
    await expect(
      page.getByRole("banner").getByText("Startup Demo Aurora"),
    ).toBeVisible();
    // A organização ativa nunca é a de terceiros, mesmo sem seletor.
    await expect(page.getByText("Espaço de Inovação Centro")).toHaveCount(0);
  });
});
