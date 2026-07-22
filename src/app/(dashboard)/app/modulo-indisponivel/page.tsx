import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Módulo indisponível" };

export default function ModuloIndisponivelPage() {
  return (
    <div className="mx-auto max-w-lg rounded-xl bg-surface p-8 text-center shadow-sm">
      <h1 className="text-2xl font-bold text-primary">Módulo indisponível</h1>
      <p className="mt-3 text-sm text-muted">
        Este módulo não está habilitado para a sua organização. Nenhum dado foi
        perdido — assim que ele for liberado, o item volta a aparecer no menu.
      </p>
      <Link
        href="/app"
        className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover"
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
