import { execSync } from "node:child_process";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Reseta o banco E2E dedicado: aplica migrations do zero e roda o seed.
 * Garante dados previsíveis e isolamento do banco de desenvolvimento.
 */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  // Recria o banco E2E DEDICADO (hub_digital_e2e) — nunca o de desenvolvimento.
  // Recriação via psql no container + `migrate deploy` (não destrutivo) evita
  // o `migrate reset`, que exige consentimento interativo.
  const psql = (sql: string) =>
    execSync(
      `docker exec hub-digital-db psql -U hub -d hub_digital -c "${sql}"`,
      {
        stdio: "inherit",
      },
    );
  psql("DROP DATABASE IF EXISTS hub_digital_e2e WITH (FORCE)");
  psql("CREATE DATABASE hub_digital_e2e");
  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
  // O build NÃO acontece aqui: o Playwright sobe o `webServer` (`next start`)
  // ANTES do globalSetup, então buildar neste ponto faria o servidor iniciar
  // com o `.next` antigo e ainda ser sobrescrito por baixo — os IDs de Server
  // Action deixavam de bater e as actions viravam no-op (POST 200 sem efeito).
  // O build passou para o script `test:e2e`, antes do Playwright subir.
}
