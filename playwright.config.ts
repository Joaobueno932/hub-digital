import { defineConfig } from "@playwright/test";

/**
 * E2E do Hub Digital.
 *
 * Banco: usa um PostgreSQL DEDICADO (hub_digital_e2e no mesmo container do
 * Docker Compose), nunca o banco de desenvolvimento. A URL vem de
 * E2E_DATABASE_URL (fallback para a base local padrão). O global-setup reseta
 * o schema e aplica o seed antes da suíte.
 *
 * Execução: `npm run test:e2e` (requer `docker compose up -d`).
 */

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://hub:hub_dev_password@localhost:5433/hub_digital_e2e";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // suíte compartilha o mesmo banco seedado
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // Server Actions que chamam `revalidatePath("/app", "layout")` reconstroem o
  // layout inteiro e, no build de produção sob carga da suíte, passam dos 5s
  // padrão. Aumentar o teto do expect não enfraquece nenhuma asserção — só
  // evita falha por tempo em máquina lenta.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Pool maior e espera mais longa: o servidor único atende a suíte
      // inteira e, com o pool padrão, transações mais pesadas (aprovação de
      // cadastro) ficavam presas esperando conexão sob carga acumulada.
      DATABASE_URL: `${E2E_DATABASE_URL}${E2E_DATABASE_URL.includes("?") ? "&" : "?"}connection_limit=25&pool_timeout=30`,
      AUTH_SECRET: "e2e-only-secret",
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_TRUST_HOST: "true",
      // Toda a suíte vem de 127.0.0.1, então o teto por IP (10/min em
      // produção) seria estourado pelo conjunto dos testes e provocaria
      // falhas cruzadas. O limite POR USUÁRIO continua no valor de produção
      // e segue coberto pelos testes de duplicidade/rate limit.
      REGISTRATION_IP_RATE_LIMIT: "1000",
    },
  },
});
