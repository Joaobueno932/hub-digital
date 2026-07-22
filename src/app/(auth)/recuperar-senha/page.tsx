import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recuperar senha" };

// Estrutura preparada: o envio real de e-mail depende do MailProvider
// (mock em desenvolvimento). Ver docs/plano-implementacao.md, etapa 1.3.
export default function RecuperarSenhaPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-primary">Recuperar senha</h1>
      <p className="mt-1 text-sm text-muted">
        Informe o seu e-mail. Se houver uma conta cadastrada, enviaremos as
        instruções de redefinição de senha.
      </p>
      <form className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 font-semibold text-foreground-inverse hover:bg-accent-hover"
        >
          Enviar instruções
        </button>
      </form>
      <p className="mt-4 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
        Funcionalidade em preparação: o envio de e-mail será ativado com o
        provedor institucional.
      </p>
    </>
  );
}
