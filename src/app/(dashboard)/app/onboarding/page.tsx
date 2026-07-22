import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/authz";
import { getOnboardingProfile } from "@/modules/onboarding/services/get-onboarding-profile";
import { StageSelector } from "@/modules/onboarding/components/stage-selector";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser();
  const profile = await getOnboardingProfile(user.id);

  // Concluído: não recria rascunho — mostra o resultado.
  if (profile?.status === "COMPLETED") redirect("/app/onboarding/concluido");

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-medium text-accent">
        Bem-vindo ao Hub Digital
      </p>
      <h1 className="mt-1 text-2xl font-bold text-primary">
        Vamos personalizar a sua jornada
      </h1>
      <p className="mt-2 text-sm text-muted">
        Conte-nos em que estágio você está. Essa informação ajudará o Hub
        Digital a personalizar futuramente conteúdos, serviços e oportunidades
        para o seu momento.
      </p>

      <StageSelector initialStage={profile?.selectedStage ?? null} />
    </div>
  );
}
