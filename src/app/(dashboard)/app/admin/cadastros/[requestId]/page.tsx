import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/authz";
import { getRegistrationRequest } from "@/modules/registrations/services/registration-requests";
import { parseRegistrationPayload } from "@/modules/registrations/schemas/payloads";
import { DecisionPanel } from "@/modules/registrations/components/decision-panel";
import { z } from "zod";

export const metadata: Metadata = { title: "Solicitação de cadastro" };

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

export default async function CadastroDetalhePage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const ctx = await requirePermission("registrations.view");
  const { requestId } = await params;

  // ID malformado ou inexistente → 404 genérico, sem vazar informações.
  if (!z.uuid().safeParse(requestId).success) notFound();
  const request = await getRegistrationRequest(requestId);
  if (!request) notFound();

  const parsed = parseRegistrationPayload(request.type, request.payload);
  const canDecide =
    request.status === "PENDING" &&
    (await hasPermission("registrations.approve")) &&
    request.requesterId !== ctx.user.id;
  const isSelf = request.requesterId === ctx.user.id;

  return (
    <>
      <Link
        href="/app/admin/cadastros"
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar para solicitações
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">
          Solicitação — {TYPE_LABEL[request.type] ?? request.type}
        </h1>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            request.status === "PENDING"
              ? "bg-warning/10 text-warning"
              : request.status === "APPROVED"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
          }`}
        >
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Dados enviados</h2>
        {parsed.ok ? (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            {"organizationName" in parsed.data ? (
              <div className="sm:col-span-2">
                <dt className="font-medium text-muted">Organização</dt>
                <dd className="mt-1 text-base font-semibold text-primary">
                  {parsed.data.organizationName}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-muted">Contato</dt>
              <dd className="mt-1">{parsed.data.contactName}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">E-mail</dt>
              <dd className="mt-1">{parsed.data.contactEmail}</dd>
            </div>
            {parsed.data.contactPhone ? (
              <div>
                <dt className="font-medium text-muted">Telefone</dt>
                <dd className="mt-1">{parsed.data.contactPhone}</dd>
              </div>
            ) : null}
            {"description" in parsed.data && parsed.data.description ? (
              <div className="sm:col-span-2">
                <dt className="font-medium text-muted">Descrição</dt>
                <dd className="mt-1">{parsed.data.description}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p
            role="alert"
            className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning"
          >
            Os dados desta solicitação estão em formato inválido ou legado e não
            podem ser exibidos com segurança. A aprovação automática está
            bloqueada.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Histórico</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted">Solicitante</dt>
            <dd className="mt-1">
              {request.requester
                ? `${request.requester.name} (${request.requester.email})`
                : "Solicitante externo (sem conta)"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Recebida em</dt>
            <dd className="mt-1">
              {request.createdAt.toLocaleString("pt-BR")}
            </dd>
          </div>
          {request.decidedBy ? (
            <div>
              <dt className="font-medium text-muted">Decidida por</dt>
              <dd className="mt-1">
                {request.decidedBy.name} em{" "}
                {request.decidedAt?.toLocaleString("pt-BR")}
              </dd>
            </div>
          ) : null}
          {request.decisionReason ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-muted">Justificativa</dt>
              <dd className="mt-1">{request.decisionReason}</dd>
            </div>
          ) : null}
          {request.resultingOrganization ? (
            <div>
              <dt className="font-medium text-muted">Organização criada</dt>
              <dd className="mt-1">{request.resultingOrganization.name}</dd>
            </div>
          ) : null}
          {request.previousRequest ? (
            <div>
              <dt className="font-medium text-muted">Solicitação anterior</dt>
              <dd className="mt-1">
                <Link
                  href={`/app/admin/cadastros/${request.previousRequest.id}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Ver solicitação anterior
                </Link>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {request.status === "PENDING" ? (
        isSelf ? (
          <p className="mt-6 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            Esta é a sua própria solicitação: outra pessoa autorizada precisa
            analisá-la.
          </p>
        ) : canDecide ? (
          <DecisionPanel requestId={request.id} canApprove={parsed.ok} />
        ) : (
          <p className="mt-6 text-sm text-muted">
            Você pode visualizar esta solicitação, mas não possui permissão para
            decidi-la.
          </p>
        )
      ) : (
        <p className="mt-6 text-sm text-muted">
          Solicitação já processada — nenhuma ação disponível.
        </p>
      )}
    </>
  );
}
