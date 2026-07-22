-- Onboarding: seleção de estágio (Etapa 1.6)
-- A tabela onboarding_profiles está vazia nesta fase, então a substituição de
-- valores de enum e a remoção de colunas são seguras.

-- Remove colunas não utilizadas no escopo confirmado (apenas seleção de estágio)
ALTER TABLE "onboarding_profiles" DROP COLUMN "answers";
ALTER TABLE "onboarding_profiles" DROP COLUMN "questionnaireVersion";

-- Novo campo de controle otimista de concorrência
ALTER TABLE "onboarding_profiles" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Renomeia stage -> selectedStage
ALTER TABLE "onboarding_profiles" RENAME COLUMN "stage" TO "selectedStage";

-- OnboardingStage: substitui os valores por nomes semânticos
ALTER TYPE "OnboardingStage" RENAME TO "OnboardingStage_old";
CREATE TYPE "OnboardingStage" AS ENUM ('WANT_TO_START', 'HAVE_IDEA', 'HAVE_IDEA_AND_TEAM', 'HAVE_TEAM_AND_SOLUTION', 'HAVE_STARTUP_OR_COMPANY');
ALTER TABLE "onboarding_profiles" ALTER COLUMN "selectedStage" TYPE "OnboardingStage" USING ("selectedStage"::text::"OnboardingStage");
DROP TYPE "OnboardingStage_old";

-- OnboardingStatus: IN_PROGRESS -> DRAFT
ALTER TABLE "onboarding_profiles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "OnboardingStatus" RENAME TO "OnboardingStatus_old";
CREATE TYPE "OnboardingStatus" AS ENUM ('DRAFT', 'COMPLETED');
ALTER TABLE "onboarding_profiles" ALTER COLUMN "status" TYPE "OnboardingStatus" USING ("status"::text::"OnboardingStatus");
ALTER TABLE "onboarding_profiles" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "OnboardingStatus_old";
