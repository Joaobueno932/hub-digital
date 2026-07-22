import Link from "next/link";
import { getFeatureFlagDefinition } from "@/config/feature-flags";

/**
 * Página "em preparação" dos módulos das fases 2–6 (CLAUDE.md: os módulos
 * aparecem no menu e exibem uma página informando que estão em preparação).
 *
 * Só é renderizada quando a flag está habilitada — quem chama passa antes por
 * `requireFeature`, que redireciona para /app/modulo-indisponivel caso
 * contrário. Nenhuma funcionalidade de módulo é implementada aqui.
 */
export function ModulePlaceholder({ flagKey }: { flagKey: string }) {
  const definition = getFeatureFlagDefinition(flagKey);
  const name = definition?.name ?? flagKey;

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">{name}</h1>
      <div className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted">
          {definition?.description ?? "Módulo do ecossistema."}
        </p>
        <p className="mt-4 text-sm">
          Este módulo está <strong>habilitado</strong> para a sua organização,
          mas ainda está em preparação — as funcionalidades chegam em uma fase
          futura do projeto.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-block rounded-md border border-muted/40 px-4 py-2 text-sm hover:bg-muted/10"
        >
          Voltar ao painel
        </Link>
      </div>
    </>
  );
}
