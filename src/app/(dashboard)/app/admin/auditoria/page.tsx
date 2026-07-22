import type { Metadata } from "next";
import { requireGlobalPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AdminAuditoriaPage() {
  await requireGlobalPermission("audit.view");

  const logs = await prisma.auditLog.findMany({
    include: { actor: true, organization: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Auditoria</h1>
      <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Quando
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Ator
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Ação
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Organização
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-muted/10 last:border-0"
              >
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {log.createdAt.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">{log.actor?.name ?? "Sistema"}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3">{log.organization?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
