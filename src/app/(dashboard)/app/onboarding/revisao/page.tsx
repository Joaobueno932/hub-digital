import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/authz";
import { getOnboardingProfile } from "@/modules/onboarding/services/get-onboarding-profile";
import { getStageOption } from "@/modules/onboarding/config/stages";
import { CompletePanel } from "@/modules/onboarding/components/complete-panel";

export const metadata: Metadata = { title: "Revisão do onboarding" };

export default async function OnboardingReviewPage() {
  const user = await requireAuthenticatedUser();
  const profile = await getOnboardingProfile(user.id);

  if (profile?.status === "COMPLETED") redirect("/app/onboarding/concluido");
  // Sem rascunho ou sem estágio escolhido: volta para a seleção.
  if (!profile || !profile.selectedStage) redirect("/app/onboarding");

  const stage = getStageOption(profile.selectedStage);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-primary">Revise a sua escolha</h1>
      <p className="mt-2 text-sm text-muted">
        Confira o estágio selecionado antes de concluir.
      </p>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Estágio selecionado
        </p>
        <h2 className="mt-1 text-lg font-semibold text-primary">
          {stage?.title}
        </h2>
        <p className="mt-2 text-sm text-muted">{stage?.description}</p>
      </section>

      <p className="mt-4 rounded-md bg-secondary/15 px-3 py-2 text-sm text-primary">
        Essa informação ajudará o Hub Digital a personalizar futuramente
        conteúdos, serviços e oportunidades para o seu momento.
      </p>

      <CompletePanel />
    </div>
  );
}
