import type { Metadata } from "next";
import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/authz";
import { listMyRegistrationRequests } from "@/modules/registrations/services/submit-registration";

export const metadata: Metadata = { title: "Minhas solicitações" };

const TYPE_LABEL: Record<string, string> = {
  USER: "Usuário",
  STARTUP: "Startup",
  ESPACO_INOVACAO: "Espaço de inovação",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
  RESUBMITTED: "Reenviada",
};

function statusClass(status: string): string {
  if (status === "PENDING") return "bg-warning/10 text-warning";
  if (status === "APPROVED") return "bg-success/10 text-success";
  return "bg-danger/10 text-danger";
}

export default async function MinhasSolicitacoesPage() {
  const user = await requireAuthenticatedUser();
  // Escopo sempre pelo usuário da sessão — nunca por id vindo do cliente.
  const requests = await listMyRegistrationRequests(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Minhas solicitações</h1>
        <div className="flex gap-2">
          <Link
            href="/cadastro/startup"
            className="rounded-md border border-muted/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface"
          >
            Nova startup
          </Link>
          <Link
            href="/cadastro/espaco-inovacao"
            className="rounded-md border border-muted/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface"
          >
            Novo espaço
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="mt-6 rounded-xl bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-muted">
            Você ainda não enviou solicitações institucionais.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-muted/20 text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Enviada em
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Atualizada em
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Detalhe
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-muted/10 align-top last:border-0"
                >
                  <td className="px-4 py-3">{TYPE_LABEL[r.type] ?? r.type}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {r.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {r.updatedAt.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(r.status)}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r.status === "REJECTED" && r.decisionReason ? (
                      <span>Justificativa: {r.decisionReason}</span>
                    ) : r.status === "APPROVED" && r.resultingOrganization ? (
                      <span>
                        Organização criada: {r.resultingOrganization.name}
                      </span>
                    ) : r.status === "PENDING" ? (
                      <span>Em análise.</span>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        A edição de solicitações já enviadas e o reenvio após reprovação
        dependem de regras a serem confirmadas.
      </p>
    </>
  );
}
