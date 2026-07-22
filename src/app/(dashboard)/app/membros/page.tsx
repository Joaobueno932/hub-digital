import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { listOrganizationMembers } from "@/modules/memberships/services/list-members";
import { ALLOWED_ROLES_BY_ORG_TYPE } from "@/modules/memberships/config/role-matrix";
import {
  MembersPanel,
  type MemberRow,
} from "@/modules/memberships/components/members-panel";

export const metadata: Metadata = { title: "Membros" };

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePermission("members.manage");
  if (!ctx.activeMembership) redirect("/app/sem-organizacao");
  const params = await searchParams;

  const organizationId = ctx.activeMembership.organizationId;
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { type: true },
  });

  const canInvite = await hasPermission("invitations.manage");

  const status =
    params.status === "SUSPENDED" || params.status === "ACTIVE"
      ? params.status
      : undefined;

  const { members, total, page, totalPages } = await listOrganizationMembers({
    organizationId,
    search: params.q,
    roleCode: params.role,
    status,
    page: params.page ? Number(params.page) : 1,
  });

  const allowedRoleCodes =
    ALLOWED_ROLES_BY_ORG_TYPE[organization.type.code] ?? [];
  const assignableRoles = await prisma.role.findMany({
    where: { code: { in: allowedRoleCodes } },
  });

  const rows: MemberRow[] = members.map((m) => ({
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    roleCodes: m.roles.map((r) => r.role.code),
    roleNames: m.roles.map((r) => r.role.name),
    status: m.status as "ACTIVE" | "SUSPENDED",
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Membros</h1>
      <p className="mt-1 text-sm text-muted">
        Membros de {organization.name} ({total} no total).
      </p>

      <form className="mt-4 flex flex-wrap gap-3" method="get">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar membros"
          className="min-w-[220px] rounded-md border border-muted/40 px-3 py-2 text-sm"
        />
        <select
          name="role"
          defaultValue={params.role ?? ""}
          aria-label="Filtrar por papel"
          className="rounded-md border border-muted/40 px-3 py-2 text-sm"
        >
          <option value="">Todos os papéis</option>
          {assignableRoles.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
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
          <option value="ACTIVE">Ativos</option>
          <option value="SUSPENDED">Suspensos</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-muted/40 px-4 py-2 text-sm hover:bg-muted/10"
        >
          Filtrar
        </button>
      </form>

      <MembersPanel
        organizationId={organizationId}
        members={rows}
        assignableRoles={assignableRoles}
        canInvite={canInvite}
      />

      {totalPages > 1 ? (
        <nav
          className="mt-4 flex justify-center gap-2 text-sm"
          aria-label="Paginação"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{
                pathname: "/app/membros",
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

      {canInvite ? (
        <p className="mt-4 text-sm text-muted">
          Consulte os convites enviados em{" "}
          <Link
            href="/app/convites"
            className="text-primary underline-offset-2 hover:underline"
          >
            Convites
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
