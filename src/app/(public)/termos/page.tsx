import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Termos de uso" };

// Conteúdo PROVISÓRIO — a redação jurídica definitiva ainda precisa ser
// validada (ver docs/pendencias-negocio.md). Não usar como texto aprovado.
export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-primary">Termos de uso</h1>
      <p className="mt-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        Conteúdo provisório, sujeito a validação jurídica. Esta versão não
        representa os termos definitivos do Hub Digital.
      </p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          Ao utilizar o Hub Digital e enviar solicitações institucionais, você
          declara que as informações fornecidas são verdadeiras e de sua
          responsabilidade.
        </p>
        <p>
          As solicitações enviadas passam por análise da equipe do Hub. O envio
          não garante aprovação nem cria vínculos automáticos.
        </p>
        <p>
          Estes termos poderão ser atualizados. A versão aceita no momento do
          envio é registrada para fins de histórico.
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
