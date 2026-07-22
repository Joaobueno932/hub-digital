import type { Metadata } from "next";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Perfis" };

export default async function AdminPerfisPage() {
  await requirePermission("roles.manage");

  const roles = await prisma.role.findMany({
    include: { _count: { select: { permissions: true, memberships: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Perfis</h1>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Código
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Permissões
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Vínculos
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-muted/10 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r._count.permissions}</td>
                <td className="px-4 py-3">{r._count.memberships}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
