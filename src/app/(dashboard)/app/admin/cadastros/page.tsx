import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/authz";
import { listRegistrationRequests } from "@/modules/registrations/services/registration-requests";
import { parseRegistrationPayload } from "@/modules/registrations/schemas/payloads";
import type {
  RegistrationStatus,
  RegistrationType,
} from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Solicitações de cadastro" };

const TYPE_LABEL: Record<string, string> = {
  USER: "Usuário",
  STARTUP: "Startup",
  ESPACO_INOVACAO: "Espaço de inovação",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
  RESUBMITTED: "Reenviada",
};

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const TYPES = ["USER", "STARTUP", "ESPACO_INOVACAO"] as const;

function statusBadgeClass(status: string): string {
  if (status === "PENDING") return "bg-warning/10 text-warning";
  if (status === "APPROVED") return "bg-success/10 text-success";
  return "bg-danger/10 text-danger";
}

export default async function AdminCadastrosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    page?: string;
  }>;
}) {
  await requirePermission("registrations.list");
  const params = await searchParams;

  const status = STATUSES.includes(params.status as (typeof STATUSES)[number])
    ? (params.status as RegistrationStatus)
    : undefined;
  const type = TYPES.includes(params.type as (typeof TYPES)[number])
    ? (params.type as RegistrationType)
    : undefined;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;

  const result = await listRegistrationRequests({
    q: params.q,
    status,
    type,
    page,
  });

  const buildQuery = (overrides: Record<string, string | undefined>) => {
    const qp = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: params.q,
      status: params.status,
      type: params.type,
      ...overrides,
    })) {
      if (value) qp.set(key, value);
    }
    const s = qp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">
        Solicitações de cadastro
      </h1>

      <div className="mt-4 flex flex-wrap gap-3" aria-label="Resumo por status">
        {STATUSES.map((s) => (
          <div
            key={s}
            className="rounded-lg bg-surface px-4 py-2 text-sm shadow-sm"
          >
            <span className="text-muted">{STATUS_LABEL[s]}: </span>
            <span className="font-semibold text-primary">
              {result.summary[s] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3" role="search">
        <div>
          <label htmlFor="q" className="block text-xs font-medium text-muted">
            Busca
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Nome, e-mail ou organização"
            className="mt-1 rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="block text-xs font-medium text-muted"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="mt-1 rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="type"
            className="block text-xs font-medium text-muted"
          >
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue={params.type ?? ""}
            className="mt-1 rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-foreground-inverse hover:opacity-90"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Solicitante
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Organização
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Tipo
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Recebida em
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Atualizada em
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Decidida por
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  Nenhuma solicitação encontrada com os filtros atuais.
                </td>
              </tr>
            ) : (
              result.items.map((r) => {
                const parsed = parseRegistrationPayload(r.type, r.payload);
                const orgName =
                  parsed.ok && "organizationName" in parsed.data
                    ? parsed.data.organizationName
                    : "—";
                return (
                  <tr
                    key={r.id}
                    className="border-b border-muted/10 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p>{r.requester?.name ?? "Solicitante externo"}</p>
                      <p className="text-xs text-muted">
                        {r.requester?.email ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{orgName}</td>
                    <td className="px-4 py-3">
                      {TYPE_LABEL[r.type] ?? r.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.status)}`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {r.createdAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {r.updatedAt.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{r.decidedBy?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/admin/cadastros/${r.id}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Visualizar
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Paginação"
        className="mt-4 flex items-center justify-between text-sm"
      >
        <p className="text-muted">
          Página {result.page} de {result.totalPages} — {result.total}{" "}
          solicitações
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              href={`/app/admin/cadastros${buildQuery({ page: String(result.page - 1) })}`}
              className="rounded-md border border-muted/40 px-3 py-1.5 hover:bg-surface"
            >
              Anterior
            </Link>
          ) : null}
          {result.page < result.totalPages ? (
            <Link
              href={`/app/admin/cadastros${buildQuery({ page: String(result.page + 1) })}`}
              className="rounded-md border border-muted/40 px-3 py-1.5 hover:bg-surface"
            >
              Próxima
            </Link>
          ) : null}
        </div>
      </nav>
    </>
  );
}
