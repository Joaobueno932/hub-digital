import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidade" };

// Conteúdo PROVISÓRIO — a redação definitiva e as bases legais (LGPD) ainda
// precisam ser validadas (ver docs/pendencias-negocio.md).
export default function PoliticaPrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">
        Política de privacidade
      </h1>
      <p className="mt-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        Conteúdo provisório, sujeito a validação. Esta versão não representa a
        política definitiva de privacidade do Hub Digital.
      </p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Os dados enviados nas solicitações institucionais (nome, e-mail,
          telefone quando informado e dados da organização) são utilizados
          exclusivamente para a análise da solicitação e o contato relacionado.
        </p>
        <p>
          Não compartilhamos os seus dados com terceiros para fins de marketing.
          O responsável pelo tratamento e os prazos de retenção serão detalhados
          na versão definitiva.
        </p>
        <p>
          Você poderá solicitar informações sobre os seus dados por meio dos
          canais oficiais do Hub Digital.
        </p>
      </div>
      <p className="mt-8 text-sm">
        <Link
          href="/"
          className="text-primary underline-offset-2 hover:underline"
        >
          Voltar à página inicial
        </Link>
      </p>
    </main>
  );
}
