import { Pool } from "pg";
import type { RegistrationType } from "../src/generated/prisma/enums";
import { E2E_DATABASE_URL } from "../playwright.config";

/**
 * Fixtures de banco para os testes E2E — conectam DIRETO ao banco E2E dedicado
 * (hub_digital_e2e), o mesmo que o webServer usa. SQL bruto via `pg` porque o
 * client Prisma gerado é ESM e não carrega no runner CommonJS do Playwright.
 *
 * Cada cenário cria o próprio registro (nome único), age via UI e limpa
 * depois: nenhum teste depende de registro mutável compartilhado do seed nem
 * da ordem de execução.
 */
// `allowExitOnIdle` deixa o processo do worker Playwright encerrar sozinho
// quando as conexões ficam ociosas — não chamamos `pool.end()`. O pool é um
// singleton de módulo compartilhado por todos os specs do mesmo worker; um
// `end()` no `afterAll` de um arquivo derrubaria o pool para os arquivos
// seguintes do mesmo worker ("Cannot use a pool after calling end on the pool").
const pool = new Pool({
  connectionString: E2E_DATABASE_URL,
  max: 4,
  allowExitOnIdle: true,
});

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type CreateRequestInput = {
  type: RegistrationType;
  organizationName: string;
  /** e-mail de um usuário existente como solicitante. */
  requesterEmail?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  /** payload extra mesclado (ex.: cidade/estado). */
  payload?: Record<string, unknown>;
  /** substitui todo o payload (ex.: payload inválido/legado). */
  rawPayload?: Record<string, unknown>;
  /** true → sem requesterId (solicitante externo). */
  external?: boolean;
};

export type CreatedRequest = {
  requestId: string;
  requesterId: string | null;
  requesterEmail: string | null;
  requesterName: string | null;
  organizationName: string;
};

/** Cria uma RegistrationRequest isolada e retorna os ids para asserção/limpeza. */
export async function createRegistrationRequest(
  input: CreateRequestInput,
): Promise<CreatedRequest> {
  let requesterId: string | null = null;
  let requesterEmail: string | null = null;
  let requesterName: string | null = null;

  if (!input.external) {
    if (input.requesterEmail) {
      const { rows } = await pool.query(
        `SELECT id, name, email FROM users WHERE email = $1`,
        [input.requesterEmail],
      );
      if (rows.length === 0)
        throw new Error(`Usuário não encontrado: ${input.requesterEmail}`);
      requesterId = rows[0].id;
      requesterEmail = rows[0].email;
      requesterName = rows[0].name;
    } else {
      const email = `e2e-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
      const name = uniqueName("Solicitante E2E");
      const { rows } = await pool.query(
        `INSERT INTO users (id, name, email, status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', now(), now()) RETURNING id`,
        [name, email],
      );
      requesterId = rows[0].id;
      requesterEmail = email;
      requesterName = name;
    }
  }

  const payload = input.rawPayload ?? {
    organizationName: input.organizationName,
    contactName: "Solicitante E2E",
    contactEmail: requesterEmail ?? "externo@test.local",
    ...input.payload,
  };

  const { rows } = await pool.query(
    `INSERT INTO registration_requests (id, type, "requesterId", status, payload, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1::"RegistrationType", $2, $3::"RegistrationStatus", $4::jsonb, now(), now())
     RETURNING id`,
    [
      input.type,
      requesterId,
      input.status ?? "PENDING",
      JSON.stringify(payload),
    ],
  );

  return {
    requestId: rows[0].id,
    requesterId,
    requesterEmail,
    requesterName,
    organizationName: input.organizationName,
  };
}

export async function getRequestStatus(
  requestId: string,
): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT status FROM registration_requests WHERE id = $1`,
    [requestId],
  );
  return rows[0]?.status ?? null;
}

export async function countAudit(
  action: string,
  entityId: string,
): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM audit_logs WHERE action = $1 AND "entityId" = $2`,
    [action, entityId],
  );
  return rows[0].n;
}

/** Remove tudo o que uma solicitação pode ter gerado (idempotente). */
export async function cleanupRequest(created: CreatedRequest): Promise<void> {
  const { rows } = await pool.query(
    `SELECT "resultingOrganizationId" FROM registration_requests WHERE id = $1`,
    [created.requestId],
  );
  const orgId: string | null = rows[0]?.resultingOrganizationId ?? null;

  await pool.query(`DELETE FROM audit_logs WHERE "entityId" = $1`, [
    created.requestId,
  ]);
  await pool.query(`DELETE FROM registration_requests WHERE id = $1`, [
    created.requestId,
  ]);

  if (orgId) {
    await pool.query(
      `DELETE FROM membership_roles WHERE "membershipId" IN
         (SELECT id FROM memberships WHERE "organizationId" = $1)`,
      [orgId],
    );
    await pool.query(`DELETE FROM audit_logs WHERE "organizationId" = $1`, [
      orgId,
    ]);
    await pool.query(`DELETE FROM memberships WHERE "organizationId" = $1`, [
      orgId,
    ]);
    await pool.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
  }

  if (created.requesterId) {
    await pool.query(`DELETE FROM notifications WHERE "userId" = $1`, [
      created.requesterId,
    ]);
    // Usuários exclusivos do teste (prefixo e2e-req-) são removidos; usuários
    // do seed reaproveitados permanecem.
    if (created.requesterEmail?.startsWith("e2e-req-")) {
      await pool.query(
        `DELETE FROM membership_roles WHERE "membershipId" IN
           (SELECT id FROM memberships WHERE "userId" = $1)`,
        [created.requesterId],
      );
      await pool.query(`DELETE FROM memberships WHERE "userId" = $1`, [
        created.requesterId,
      ]);
      await pool.query(`DELETE FROM onboarding_profiles WHERE "userId" = $1`, [
        created.requesterId,
      ]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [
        created.requesterId,
      ]);
    }
  }
}
