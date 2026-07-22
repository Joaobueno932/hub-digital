import type { Metadata } from "next";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-primary">Entrar no Hub Digital</h1>
      <p className="mt-1 text-sm text-muted">
        Acesse com o seu e-mail e senha cadastrados.
      </p>
      <LoginForm />
    </>
  );
}
