import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSessionContext, hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { OrganizationForm } from "@/modules/organizations/components/organization-form";

export const metadata: Metadata = { title: "Minha organização" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PENDING: "Pendente",
  SUSPENDED: "Suspensa",
  ARCHIVED: "Arquivada",
};

export default async function MinhaOrganizacaoPage() {
  const ctx = await requireSessionContext();
  if (!ctx.activeMembership) redirect("/app/sem-organizacao");

  // Escopo garantido: sempre a organização do vínculo ativo validado.
  const organizationId = ctx.activeMembership.organizationId;
  const canEdit = await hasPermission("organizations.update.own");

  const [organization, membersCount, recentAudit] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { type: true },
    }),
    prisma.membership.count({
      where: { organizationId, status: "ACTIVE", deletedAt: null },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: "organization",
        entityId: organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { actor: true },
    }),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Minha organização</h1>
      <div className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted">Nome</dt>
            <dd className="mt-1 text-base font-semibold text-primary">
              {organization.name}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Tipo</dt>
            <dd className="mt-1">{organization.type.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Status</dt>
            <dd className="mt-1">
              <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                {STATUS_LABEL[organization.status] ?? organization.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Membros ativos</dt>
            <dd className="mt-1">{membersCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Criada em</dt>
            <dd className="mt-1">
              {organization.createdAt.toLocaleDateString("pt-BR")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-muted">Seus papéis</dt>
            <dd className="mt-1">
              {ctx.activeMembership.roles.map((r) => r.role.name).join(", ") ||
                "Sem papel"}
            </dd>
          </div>
        </dl>
      </div>

      {canEdit ? (
        <OrganizationForm
          scope="own"
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
      ) : (
        <p className="mt-6 text-sm text-muted">
          Você não tem permissão para editar os dados desta organização.
        </p>
      )}

      {recentAudit.length > 0 ? (
        <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">
            Histórico administrativo
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {recentAudit.map((entry) => (
              <li key={entry.id}>
                {entry.createdAt.toLocaleString("pt-BR")} —{" "}
                {entry.actor?.name ?? "Sistema"} — {entry.action}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
