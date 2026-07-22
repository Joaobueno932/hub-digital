import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireAuthenticatedUser } from "@/lib/authz";
import { getOnboardingProfile } from "@/modules/onboarding/services/get-onboarding-profile";
import { getStageOption } from "@/modules/onboarding/config/stages";

export const metadata: Metadata = { title: "Onboarding concluído" };

export default async function OnboardingDonePage() {
  const user = await requireAuthenticatedUser();
  const profile = await getOnboardingProfile(user.id);

  // Sem conclusão: leva ao fluxo (não cria nada automaticamente).
  if (!profile || profile.status !== "COMPLETED") redirect("/app/onboarding");

  const stage = profile.selectedStage
    ? getStageOption(profile.selectedStage)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl bg-surface p-8 text-center shadow-sm">
        <CheckCircle2 aria-hidden className="mx-auto h-10 w-10 text-success" />
        <h1 className="mt-4 text-2xl font-bold text-primary">
          Perfil inicial concluído
        </h1>
        <p className="mt-2 text-sm text-muted">
          Seu estágio no Hub Digital foi registrado com sucesso.
        </p>

        {stage ? (
          <div className="mt-6 rounded-lg bg-background p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Seu estágio
            </p>
            <p className="mt-1 font-semibold text-primary">{stage.title}</p>
            <p className="mt-1 text-sm text-muted">{stage.description}</p>
          </div>
        ) : null}

        <Link
          href="/app"
          className="mt-8 inline-block rounded-md bg-accent px-6 py-2.5 font-semibold text-foreground-inverse hover:bg-accent-hover"
        >
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
