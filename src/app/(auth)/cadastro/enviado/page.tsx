import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Solicitação enviada" };

export default function RequestSentPage() {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <CheckCircle2 aria-hidden className="mx-auto h-10 w-10 text-success" />
      <h1 className="mt-4 text-xl font-bold text-primary">
        Solicitação recebida
      </h1>
      <p className="mt-2 text-sm text-muted">
        Recebemos a sua solicitação com o status <strong>pendente</strong>. A
        equipe do Hub fará a análise e você poderá acompanhar o andamento na sua
        conta.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/app/minhas-solicitacoes"
          className="rounded-md bg-accent px-4 py-2 font-semibold text-foreground-inverse hover:bg-accent-hover"
        >
          Ver minhas solicitações
        </Link>
        <Link
          href="/app"
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
