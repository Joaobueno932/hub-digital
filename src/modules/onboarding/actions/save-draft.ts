"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/authz";
import { saveDraftSchema } from "../schemas/draft";
import { saveOnboardingDraft } from "../services/save-onboarding-draft";
import { OnboardingAlreadyCompletedError } from "../services/errors";

export type SaveDraftState = {
  status: "idle" | "saved" | "error";
  message?: string;
};

/**
 * Salva o rascunho. `intent=continue` avança para a revisão; `intent=save`
 * permanece com feedback de sucesso. userId sempre da sessão.
 */
export async function saveDraftAction(
  _prev: SaveDraftState,
  formData: FormData,
): Promise<SaveDraftState> {
  const user = await requireAuthenticatedUser();

  const parsed = saveDraftSchema.safeParse({
    selectedStage: formData.get("selectedStage"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Selecione uma opção.",
    };
  }

  try {
    await saveOnboardingDraft({
      userId: user.id,
      selectedStage: parsed.data.selectedStage,
    });
  } catch (error) {
    if (error instanceof OnboardingAlreadyCompletedError) {
      return { status: "error", message: error.message };
    }
    console.error("save onboarding draft error", error);
    return {
      status: "error",
      message: "Não foi possível salvar. Tente novamente.",
    };
  }

  revalidatePath("/app/onboarding");
  revalidatePath("/app");

  if (formData.get("intent") === "continue") {
    redirect("/app/onboarding/revisao");
  }
  return {
    status: "saved",
    message: "Rascunho salvo. Você pode continuar depois.",
  };
}
