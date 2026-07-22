import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Membros" };

export default async function MembrosPage() {
  const ctx = await requirePermission("members.manage");
  if (!ctx.activeMembership) redirect("/app/sem-organizacao");

  // Isolamento multiempresa: a lista é sempre da organização do vínculo ativo.
  const members = await prisma.membership.findMany({
    where: {
      organizationId: ctx.activeMembership.organizationId,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: { user: true, roles: { include: { role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Membros</h1>
      <p className="mt-1 text-sm text-muted">
        Membros ativos de {ctx.activeMembership.organization.name}.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Papéis
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-muted/10 last:border-0">
                <td className="px-4 py-3">{m.user.name}</td>
                <td className="px-4 py-3 text-muted">{m.user.email}</td>
                <td className="px-4 py-3">
                  {m.roles.map((r) => r.role.name).join(", ") || "Sem papel"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        Convites e gestão de papéis serão liberados na próxima etapa da Fase 1.
      </p>
    </>
  );
}
