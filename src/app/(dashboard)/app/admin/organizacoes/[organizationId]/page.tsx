import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermissionForOrganization } from "@/lib/authz";
import { hasPermission as hasPermissionForOrg } from "@/modules/permissions/services/authorization";
import { prisma } from "@/lib/prisma";
import { OrganizationForm } from "@/modules/organizations/components/organization-form";
import { OrganizationStatusActions } from "@/modules/organizations/components/organization-status-actions";
import { listOrganizationInvitations } from "@/modules/invitations/services/list-invitations";

export const metadata: Metadata = { title: "Organização" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PENDING: "Pendente",
  SUSPENDED: "Suspensa",
  ARCHIVED: "Arquivada",
};

export default async function AdminOrganizacaoDetalhePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  if (!z.uuid().safeParse(organizationId).success) notFound();

  const ctx = await requirePermissionForOrganization(
    "organizations.view",
    organizationId,
  );

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    include: { type: true, _count: { select: { memberships: true } } },
  });
  if (!organization) notFound();

  const canEdit =
    ctx.access.superAdmin ||
    ctx.access.global.has("organizations.update") ||
    (await hasPermissionForOrg(
      ctx.user.id,
      organizationId,
      "organizations.update",
    ));

  const [recentAudit, invitations] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: "organization",
        entityId: organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: true },
    }),
    listOrganizationInvitations(organizationId),
  ]);

  return (
    <>
      <Link
        href="/app/admin/organizacoes"
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar para organizações
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">{organization.name}</h1>
        <span className="rounded bg-muted/10 px-2 py-0.5 text-xs font-medium text-muted">
          {STATUS_LABEL[organization.status] ?? organization.status}
        </span>
      </div>

      <div className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted">Tipo</dt>
            <dd className="mt-1">{organization.type.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Membros ativos</dt>
            <dd className="mt-1">{organization._count.memberships}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Criada em</dt>
            <dd className="mt-1">
              {organization.createdAt.toLocaleDateString("pt-BR")}
            </dd>
          </div>
        </dl>
        {canEdit ? (
          <OrganizationStatusActions
            organizationId={organization.id}
            status={organization.status}
          />
        ) : null}
      </div>

      {canEdit ? (
        <OrganizationForm
          scope="admin"
          organization={{
            id: organization.id,
            name: organization.name,
            displayName: organization.displayName,
            description: organization.description,
            website: organization.website,
            city: organization.city,
            state: organization.state,
            updatedAt: organization.updatedAt.toISOString(),
          }}
        />
      ) : null}

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Membros</h2>
          <Link
            href={`/app/admin/organizacoes/${organization.id}/membros`}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Gerenciar membros
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Convites</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {invitations.slice(0, 10).map((inv) => (
            <li key={inv.id} className="text-muted">
              {inv.email} — {inv.role.name} — {inv.status}
            </li>
          ))}
          {invitations.length === 0 ? (
            <li className="text-muted">Nenhum convite enviado.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Auditoria recente</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {recentAudit.map((entry) => (
            <li key={entry.id}>
              {entry.createdAt.toLocaleString("pt-BR")} —{" "}
              {entry.actor?.name ?? "Sistema"} — {entry.action}
            </li>
          ))}
          {recentAudit.length === 0 ? <li>Nenhum evento registrado.</li> : null}
        </ul>
      </section>
    </>
  );
}
