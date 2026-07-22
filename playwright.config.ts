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
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "e2e-only-secret",
      AUTH_URL: `http://localhost:${PORT}`,
      AUTH_TRUST_HOST: "true",
    },
  },
});
