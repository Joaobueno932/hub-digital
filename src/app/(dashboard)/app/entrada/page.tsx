import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/authz";
import { resolvePostLoginRedirect } from "@/modules/onboarding/services/resolve-post-login-redirect";

/**
 * Rota de entrada pós-login: decide o destino no servidor conforme o estado do
 * onboarding (sem/rascunho → onboarding; concluído → painel). Mantém a regra
 * centralizada e evita importar server actions no formulário de login (client).
 */
export default async function EntradaPage() {
  const user = await requireAuthenticatedUser();
  redirect(await resolvePostLoginRedirect(user.id));
}
