import type { Metadata } from "next";
import { requireSessionContext } from "@/lib/authz";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const ctx = await requireSessionContext();

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Configurações</h1>
      <div className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Sua conta</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted">Nome</dt>
            <dd className="mt-1">{ctx.user.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">E-mail</dt>
            <dd className="mt-1">{ctx.user.email}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          Edição de perfil e alteração de senha serão liberadas na próxima etapa
          da Fase 1.
        </p>
      </div>
    </>
  );
}
