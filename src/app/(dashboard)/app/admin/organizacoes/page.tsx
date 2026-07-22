import type { Metadata } from "next";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Organizações" };

export default async function AdminOrganizacoesPage() {
  await requirePermission("organizations.list");

  const organizations = await prisma.organization.findMany({
    where: { deletedAt: null },
    include: { type: true, _count: { select: { memberships: true } } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Organizações</h1>
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
            </tr>
          </thead>
          <tbody>
            {organizations.map((o) => (
              <tr key={o.id} className="border-b border-muted/10 last:border-0">
                <td className="px-4 py-3">{o.name}</td>
                <td className="px-4 py-3">{o.type.name}</td>
                <td className="px-4 py-3">{o.status}</td>
                <td className="px-4 py-3">{o._count.memberships}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        Criação e edição de organizações serão liberadas na próxima etapa da
        Fase 1.
      </p>
    </>
  );
}
