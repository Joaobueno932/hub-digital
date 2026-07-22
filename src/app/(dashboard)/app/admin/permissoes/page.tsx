import type { Metadata } from "next";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Permissões" };

export default async function AdminPermissoesPage() {
  await requirePermission("permissions.manage");

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { code: "asc" }],
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Permissões</h1>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Código
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Módulo
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Descrição
              </th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.id} className="border-b border-muted/10 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3">{p.module}</td>
                <td className="px-4 py-3 text-muted">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
