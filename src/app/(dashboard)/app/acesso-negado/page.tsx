import type { Metadata } from "next";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata: Metadata = { title: "Acesso negado" };

// Estado genérico: nunca revela qual entidade ou dado foi solicitado.
export default function AcessoNegadoPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl bg-surface p-8 text-center shadow-sm">
      <ShieldX aria-hidden className="mx-auto h-10 w-10 text-danger" />
      <h1 className="mt-4 text-xl font-bold text-primary">Acesso negado</h1>
      <p className="mt-2 text-sm text-muted">
        Você não tem permissão para acessar este recurso na organização atual.
        Se acredita que deveria ter acesso, fale com o administrador da sua
        organização.
      </p>
      <Link
        href="/app"
        className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover"
      >
        Voltar à visão geral
      </Link>
    </div>
  );
}
