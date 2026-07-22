import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { StartupRequestForm } from "@/modules/registrations/components/startup-request-form";

export const metadata: Metadata = { title: "Solicitar cadastro de startup" };

export default async function StartupRequestPage() {
  // Estratégia: envio institucional exige autenticação (requester = sessão).
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/cadastro/startup");

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-xl font-bold text-primary">
        Solicitar cadastro de startup
      </h1>
      <p className="mt-1 text-sm text-muted">
        Envie os dados da sua startup. A solicitação passará por análise da
        equipe do Hub antes da aprovação. Nenhuma organização é criada
        automaticamente.
      </p>
      <StartupRequestForm
        defaultName={user.name ?? ""}
        defaultEmail={user.email ?? ""}
      />
      <p className="mt-4 text-sm">
        <Link
          href="/app"
          className="text-primary underline-offset-2 hover:underline"
        >
          Voltar ao painel
        </Link>
      </p>
    </div>
  );
}
