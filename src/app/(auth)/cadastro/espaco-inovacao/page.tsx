import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { InnovationSpaceRequestForm } from "@/modules/registrations/components/innovation-space-request-form";

export const metadata: Metadata = {
  title: "Solicitar cadastro de espaço de inovação",
};

export default async function InnovationSpaceRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/cadastro/espaco-inovacao");

  return (
    <div className="mx-auto w-full max-w-xl">
      <h1 className="text-xl font-bold text-primary">
        Solicitar cadastro de espaço de inovação
      </h1>
      <p className="mt-1 text-sm text-muted">
        Envie os dados do espaço de inovação. A solicitação passará por análise
        da equipe do Hub antes da aprovação. Nenhuma organização é criada
        automaticamente.
      </p>
      <InnovationSpaceRequestForm
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
