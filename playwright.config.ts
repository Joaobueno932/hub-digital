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
  // As Server Actions de decisão persistem no banco de forma rápida, mas a
  // RESPOSTA inclui o re-render do RSC revalidado (`revalidatePath` da rota
  // atual). Sob a carga acumulada da suíte, nesta máquina de desenvolvimento,
  // esse re-render passa dos 15s ocasionalmente — a operação SEMPRE conclui
  // (o registro fica no estado esperado), só o sinal de UI chega tarde. O teto
  // maior calibra o expect ao ambiente sem enfraquecer nenhuma asserção. Em CI
  // com recursos adequados o valor menor é suficiente.
  expect: { timeout: 30_000 },
  use: {
    // 127.0.0.1 (não "localhost"): no Windows, "localhost" pode resolver para
    // ::1 (IPv6) primeiro; um SYN a uma porta sem listener IPv6 pode ser
    // descartado silenciosamente pelo firewall e só falhar por timeout (~30s),
    // travando ocasionalmente a resposta de uma Server Action. Fixar IPv4
    // remove essa fonte de stall intermitente.
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      // O servidor único atende a suíte inteira. Com o driver adapter (pg), o
      // pool é dimensionado por DB_POOL_MAX (ver src/lib/prisma.ts) — os
      // parâmetros `connection_limit`/`pool_timeout` da URL são ignorados.
      DB_POOL_MAX: "30",
      AUTH_SECRET: "e2e-only-secret",
      AUTH_URL: `http://127.0.0.1:${PORT}`,
      AUTH_TRUST_HOST: "true",
      // Toda a suíte vem de 127.0.0.1, então o teto por IP (10/min em
      // produção) seria estourado pelo conjunto dos testes e provocaria
      // falhas cruzadas. O limite POR USUÁRIO continua no valor de produção
      // e segue coberto pelos testes de duplicidade/rate limit.
      REGISTRATION_IP_RATE_LIMIT: "1000",
    },
  },
});
