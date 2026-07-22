import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSessionContext } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Minha organização" };

export default async function MinhaOrganizacaoPage() {
  const ctx = await requireSessionContext();
  if (!ctx.activeMembership) redirect("/app/sem-organizacao");

  // Escopo garantido: sempre a organização do vínculo ativo validado.
  const organizationId = ctx.activeMembership.organizationId;
  const [organization, membersCount] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { type: true },
    }),
    prisma.membership.count({
      where: { organizationId, status: "ACTIVE", deletedAt: null },
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
                {organization.status === "ACTIVE"
                  ? "Ativa"
                  : organization.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Membros ativos</dt>
            <dd className="mt-1">{membersCount}</dd>
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
      <p className="mt-4 text-sm text-muted">
        A edição dos dados da organização será liberada na próxima etapa da Fase
        1.
      </p>
    </>
  );
}
