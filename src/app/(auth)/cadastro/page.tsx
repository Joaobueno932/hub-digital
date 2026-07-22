import type { Metadata } from "next";
import { RegisterForm } from "@/modules/auth/components/register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-primary">Criar conta</h1>
      <p className="mt-1 text-sm text-muted">
        Cadastro de usuário. Startups e espaços de inovação terão fluxos
        próprios de solicitação em breve.
      </p>
      <RegisterForm />
    </>
  );
}
