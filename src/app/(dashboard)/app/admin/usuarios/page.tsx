import type { Metadata } from "next";
import Link from "next/link";
import { requireGlobalPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { listUsers } from "@/modules/users/services/list-users";

export const metadata: Metadata = { title: "Usuários" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  PENDING: "Pendente",
  DEACTIVATED: "Desativado",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  SUSPENDED: "bg-danger/10 text-danger",
  PENDING: "bg-warning/10 text-warning",
  DEACTIVATED: "bg-muted/20 text-muted",
};

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    role?: string;
    org?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  // Administração de usuários da PLATAFORMA: exige escopo global. Papéis
  // organizacionais administram apenas as próprias pessoas, em /app/membros.
  await requireGlobalPermission("users.list");
  const params = await searchParams;

  const [{ users, total, page, totalPages }, roles, organizations] =
    await Promise.all([
      listUsers({
        search: params.q,
        status: params.status,
        roleCode: params.role,
        organizationId: params.org,
        sort: params.sort === "name" ? "name" : "createdAt",
        page: params.page ? Number(params.page) : 1,
      }),
      prisma.role.findMany({ orderBy: { name: "asc" } }),
      prisma.organization.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Usuários</h1>
      <p className="mt-1 text-sm text-muted">
        {total} usuário(s) na plataforma.
      </p>

      <form className="mt-4 flex flex-wrap gap-3" method="get" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar por nome ou e-mail
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por nome ou e-mail"
          className="min-w-[220px] rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={params.status ?? ""}
          aria-label="Filtrar por status"
          className="rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="role"
          defaultValue={params.role ?? ""}
          aria-label="Filtrar por papel"
          className="rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos os papéis</option>
          {roles.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          name="org"
          defaultValue={params.org ?? ""}
          aria-label="Filtrar por organização"
          className="rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas as organizações</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "createdAt"}
          aria-label="Ordenar por"
          className="rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
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
        <table className="hidden w-full text-left text-sm sm:table">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Vínculos
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Criado em
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Detalhes
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-muted/10 last:border-0">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[u.status] ?? "bg-muted/20 text-muted"
                    }`}
                  >
                    {STATUS_LABEL[u.status] ?? u.status}
                  </span>
                </td>
                <td className="px-4 py-3">{u._count.memberships}</td>
                <td className="px-4 py-3 text-muted">
                  {u.createdAt.toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/app/admin/usuarios/${u.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Cards para telas pequenas */}
        <ul className="divide-y divide-muted/10 sm:hidden">
          {users.map((u) => (
            <li key={u.id} className="p-4">
              <Link
                href={`/app/admin/usuarios/${u.id}`}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {u.name}
              </Link>
              <p className="text-sm text-muted">{u.email}</p>
              <p className="mt-1 text-xs">
                <span
                  className={`rounded px-2 py-0.5 font-medium ${
                    STATUS_BADGE[u.status] ?? "bg-muted/20 text-muted"
                  }`}
                >
                  {STATUS_LABEL[u.status] ?? u.status}
                </span>{" "}
                <span className="text-muted">
                  · {u._count.memberships} vínculo(s)
                </span>
              </p>
            </li>
          ))}
          {users.length === 0 ? (
            <li className="p-6 text-center text-muted">
              Nenhum usuário encontrado.
            </li>
          ) : null}
        </ul>
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
                pathname: "/app/admin/usuarios",
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
