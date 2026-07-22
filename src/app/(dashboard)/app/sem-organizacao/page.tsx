import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

export const metadata: Metadata = { title: "Sem organização" };

export default function SemOrganizacaoPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl bg-surface p-8 text-center shadow-sm">
      <Building2 aria-hidden className="mx-auto h-10 w-10 text-muted" />
      <h1 className="mt-4 text-xl font-bold text-primary">
        Nenhuma organização ativa
      </h1>
      <p className="mt-2 text-sm text-muted">
        Esta área exige vínculo com uma organização. Solicite o cadastro da sua
        startup ou espaço de inovação, ou peça a um administrador que adicione
        você como membro.
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
