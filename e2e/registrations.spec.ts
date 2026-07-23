import { expect, test, type Page } from "@playwright/test";
import { USERS, login } from "./helpers";
import {
  cleanupRequest,
  countAudit,
  createRegistrationRequest,
  getRequestStatus,
  uniqueName,
} from "./fixtures";

/**
 * Cadastros (admin): cada cenário destrutivo cria a PRÓPRIA solicitação com
 * nome único, age abrindo-a diretamente por id (sem depender da lista nem de
 * registros de seed compartilhados) e limpa no `finally`. Nada depende de
 * ordem de execução nem do estado deixado por outro teste.
 *
 * O pool de fixtures não é encerrado por spec (é singleton de módulo,
 * compartilhado no mesmo worker); `allowExitOnIdle` deixa o processo fechar.
 */

async function openRequest(page: Page, requestId: string) {
  await page.goto(`/app/admin/cadastros/${requestId}`);
  await expect(
    page.getByRole("heading", { name: /Solicitação —/ }),
  ).toBeVisible();
}

test.describe("solicitações de cadastro (admin)", () => {
  test("ADM_HUB aprova startup: cria organização e vínculo, e é idempotente", async ({
    page,
  }) => {
    const created = await createRegistrationRequest({
      type: "STARTUP",
      organizationName: uniqueName("Startup Aprovar"),
    });
    try {
      await login(page, USERS.admHub);
      await openRequest(page, created.requestId);

      await page.getByRole("button", { name: "Aprovar" }).click();
      await page.getByRole("button", { name: "Confirmar aprovação" }).click();
      // Sinal determinístico de sucesso: o diálogo só fecha após a action commitar.
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.reload();
      await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
      await expect(page.getByText("Organização criada")).toBeVisible();
      // Processada: idempotência refletida na UI (sem ação disponível).
      await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(
        0,
      );
      await expect(page.getByText("Solicitação já processada")).toBeVisible();

      expect(await getRequestStatus(created.requestId)).toBe("APPROVED");
    } finally {
      await cleanupRequest(created);
    }
  });

  test("ADM_HUB reprova com justificativa obrigatória e a decisão é auditada", async ({
    page,
  }) => {
    const created = await createRegistrationRequest({
      type: "ESPACO_INOVACAO",
      organizationName: uniqueName("Espaço Reprovar"),
    });
    try {
      await login(page, USERS.admHub);
      await openRequest(page, created.requestId);

      await page.getByRole("button", { name: "Reprovar" }).click();
      // Sem justificativa: o campo obrigatório bloqueia o envio.
      const confirm = page.getByRole("button", {
        name: "Confirmar reprovação",
      });
      await confirm.click();
      await expect(page.getByRole("dialog")).toBeVisible();

      const reason = "Documentação insuficiente para análise E2E.";
      await page.getByLabel("Justificativa").fill(reason);
      await confirm.click();
      await expect(page.getByRole("dialog")).toBeHidden();

      await page.reload();
      await expect(page.getByText("Reprovada", { exact: true })).toBeVisible();
      await expect(page.getByText(reason)).toBeVisible();

      expect(await getRequestStatus(created.requestId)).toBe("REJECTED");
      // A auditoria da decisão persiste (fora de qualquer rollback).
      expect(
        await countAudit("registration_request.rejected", created.requestId),
      ).toBe(1);
    } finally {
      await cleanupRequest(created);
    }
  });

  test("autoaprovação é bloqueada na interface", async ({ page }) => {
    // Solicitante = o próprio SUPER_ADMIN que fará a revisão.
    const created = await createRegistrationRequest({
      type: "STARTUP",
      organizationName: uniqueName("Startup do Próprio Admin"),
      requesterEmail: USERS.superadmin,
    });
    try {
      await login(page, USERS.superadmin);
      await openRequest(page, created.requestId);
      await expect(
        page.getByText(
          "Esta é a sua própria solicitação: outra pessoa autorizada precisa analisá-la.",
        ),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(
        0,
      );
      await expect(page.getByRole("button", { name: "Reprovar" })).toHaveCount(
        0,
      );
    } finally {
      await cleanupRequest(created);
    }
  });

  test("payload inválido bloqueia aprovação mas permite reprovação", async ({
    page,
  }) => {
    const created = await createRegistrationRequest({
      type: "STARTUP",
      organizationName: "irrelevante",
      // Payload sem os campos exigidos → parse falha (estado seguro no admin).
      rawPayload: { legacy: true },
    });
    try {
      await login(page, USERS.admHub);
      await openRequest(page, created.requestId);
      await expect(page.getByText(/formato inválido ou legado/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Aprovar" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Reprovar" }),
      ).toBeEnabled();
    } finally {
      await cleanupRequest(created);
    }
  });
});
