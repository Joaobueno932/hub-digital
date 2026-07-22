import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { listOrganizations } from "@/modules/organizations/services/list-organizations";

export const metadata: Metadata = { title: "Organizações" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PENDING: "Pendente",
  SUSPENDED: "Suspensa",
  ARCHIVED: "Arquivada",
};

export default async function AdminOrganizacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  await requirePermission("organizations.list");
  const params = await searchParams;

  const [{ organizations, total, page, totalPages }, types] = await Promise.all(
    [
      listOrganizations({
        search: params.q,
        typeCode: params.type,
        status: params.status,
        sort: params.sort === "name" ? "name" : "createdAt",
        page: params.page ? Number(params.page) : 1,
      }),
      prisma.organizationType.findMany({ orderBy: { name: "asc" } }),
    ],
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Organizações</h1>
      <p className="mt-1 text-sm text-muted">
        {total} organização(ões) no total.
      </p>

      <form className="mt-4 flex flex-wrap gap-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome"
          aria-label="Buscar organizações"
          className="min-w-[220px] rounded-md border border-muted/40 px-3 py-2 text-sm"
        />
        <select
          name="type"
          defaultValue={params.type ?? ""}
          aria-label="Filtrar por tipo"
          className="rounded-md border border-muted/40 px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          aria-label="Filtrar por status"
          className="rounded-md border border-muted/40 px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "createdAt"}
          aria-label="Ordenar por"
          className="rounded-md border border-muted/40 px-3 py-2 text-sm"
        >
          <option value="createdAt">Mais recentes</option>
          <option value="name">Nome (A-Z)</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-muted/40 px-4 py-2 text-sm hover:bg-muted/10"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Tipo
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Membros
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Criada em
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Detalhes
              </th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} className="border-b border-muted/10 last:border-0">
                <td className="px-4 py-3">{o.name}</td>
                <td className="px-4 py-3">{o.type.name}</td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[o.status] ?? o.status}
                </td>
                <td className="px-4 py-3">{o._count.memberships}</td>
                <td className="px-4 py-3 text-muted">
                  {o.createdAt.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/app/admin/organizacoes/${o.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhuma organização encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav
          className="mt-4 flex justify-center gap-2 text-sm"
          aria-label="Paginação"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{
                pathname: "/app/admin/organizacoes",
                query: { ...params, page: p },
              }}
              className={`rounded px-3 py-1 ${
                p === page
                  ? "bg-accent text-foreground-inverse"
                  : "border border-muted/40"
              }`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
