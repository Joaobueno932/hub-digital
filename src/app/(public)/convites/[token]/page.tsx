import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/authz";
import { getInvitationByToken } from "@/modules/invitations/services/get-invitation-by-token";
import { InvitationDecisionForm } from "@/modules/invitations/components/invitation-decision-form";

export const metadata: Metadata = { title: "Convite" };

const STATUS_MESSAGE: Record<string, string> = {
  ACCEPTED: "Este convite já foi aceito.",
  DECLINED: "Este convite foi recusado.",
  REVOKED: "Este convite foi revogado.",
  EXPIRED: "Este convite expirou.",
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) {
    // Callback interno seguro: sempre o próprio caminho do convite, nunca
    // um destino externo.
    redirect(`/login?callbackUrl=${encodeURIComponent(`/convites/${token}`)}`);
  }

  const invitation = await getInvitationByToken(token);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl bg-surface p-6 shadow-lg sm:p-8">
        <h1 className="text-xl font-bold text-primary">
          Convite para organização
        </h1>

        {!invitation ? (
          <p className="mt-4 text-sm text-muted">
            Convite não encontrado ou link inválido.
          </p>
        ) : invitation.status !== "PENDING" ? (
          <p className="mt-4 text-sm text-muted">
            {STATUS_MESSAGE[invitation.status] ??
              "Este convite não está mais disponível."}
          </p>
        ) : invitation.email !== (user.email ?? "").trim().toLowerCase() ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            Este convite foi enviado para outro e-mail. Entre com a conta que
            recebeu o convite para aceitá-lo.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Você foi convidado(a) para{" "}
              <strong>{invitation.organization.name}</strong> como{" "}
              <strong>{invitation.role.name}</strong>.
            </p>
            <InvitationDecisionForm token={token} />
          </>
        )}

        <p className="mt-6 text-sm">
          <Link
            href="/app"
            className="text-primary underline-offset-2 hover:underline"
          >
            Voltar ao painel
          </Link>
        </p>
      </div>
    </div>
  );
}
