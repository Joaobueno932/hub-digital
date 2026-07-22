"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/authz";
import { completeOnboarding } from "../services/complete-onboarding";
import {
  OnboardingCompletionConflictError,
  OnboardingNotReadyError,
} from "../services/errors";

export type CompleteState = {
  status: "idle" | "error";
  message?: string;
};

export async function completeOnboardingAction(
  _prev: CompleteState,
  _formData: FormData,
): Promise<CompleteState> {
  const user = await requireAuthenticatedUser();

  try {
    await completeOnboarding({ userId: user.id });
  } catch (error) {
    if (error instanceof OnboardingNotReadyError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof OnboardingCompletionConflictError) {
      // Já concluído (ex.: segunda aba): leva ao resultado, sem duplicar nada.
      redirect("/app/onboarding/concluido");
    }
    console.error("complete onboarding error", error);
    return {
      status: "error",
      message: "Não foi possível concluir. Tente novamente.",
    };
  }

  revalidatePath("/app/onboarding");
  revalidatePath("/app");
  redirect("/app/onboarding/concluido");
}
