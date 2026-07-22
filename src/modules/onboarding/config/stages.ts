import type { OnboardingStage } from "@/generated/prisma/enums";

/**
 * Fonte única dos cinco estágios de onboarding.
 *
 * São opções de CLASSIFICAÇÃO escolhidas pelo usuário — não níveis calculados,
 * não pontuações. Nenhuma lógica de maturidade, plano ou recomendação depende
 * deste arquivo nesta fase. Os textos ficam em português; os valores do enum
 * são estáveis e internos. Não repetir estas strings em componentes/serviços.
 */

export type OnboardingStageOption = {
  value: OnboardingStage;
  title: string;
  description: string;
  order: number;
  icon: string; // nome de ícone lucide-react
};

export const ONBOARDING_STAGES: readonly OnboardingStageOption[] = [
  {
    value: "WANT_TO_START",
    title: "Quero iniciar",
    description:
      "Ainda estou começando e quero descobrir por onde iniciar minha jornada de inovação.",
    order: 1,
    icon: "Sparkles",
  },
  {
    value: "HAVE_IDEA",
    title: "Tenho uma ideia",
    description:
      "Já tenho uma ideia de negócio ou solução que gostaria de desenvolver.",
    order: 2,
    icon: "Lightbulb",
  },
  {
    value: "HAVE_IDEA_AND_TEAM",
    title: "Tenho uma ideia e um time",
    description:
      "Tenho uma ideia e já reuni pessoas para trabalhar comigo nela.",
    order: 3,
    icon: "Users",
  },
  {
    value: "HAVE_TEAM_AND_SOLUTION",
    title: "Tenho um time e uma solução pronta ou quase pronta",
    description:
      "Já temos um time e uma solução desenvolvida ou próxima de estar pronta.",
    order: 4,
    icon: "Rocket",
  },
  {
    value: "HAVE_STARTUP_OR_COMPANY",
    title: "Tenho uma startup ou empresa",
    description: "Já possuo uma startup ou empresa constituída e em operação.",
    order: 5,
    icon: "Building2",
  },
] as const;

export const ONBOARDING_STAGE_VALUES = ONBOARDING_STAGES.map(
  (s) => s.value,
) as [OnboardingStage, ...OnboardingStage[]];

export function getStageOption(
  value: OnboardingStage,
): OnboardingStageOption | undefined {
  return ONBOARDING_STAGES.find((s) => s.value === value);
}

export function isValidStage(value: unknown): value is OnboardingStage {
  return (
    typeof value === "string" &&
    ONBOARDING_STAGE_VALUES.includes(value as OnboardingStage)
  );
}
