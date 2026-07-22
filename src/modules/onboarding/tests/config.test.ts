import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STAGES,
  ONBOARDING_STAGE_VALUES,
  getStageOption,
  isValidStage,
} from "../config/stages";
import { saveDraftSchema } from "../schemas/draft";
import { postLoginRedirectForState } from "../services/resolve-post-login-redirect";

describe("configuração dos estágios", () => {
  it("possui exatamente as cinco opções na ordem correta", () => {
    expect(ONBOARDING_STAGES).toHaveLength(5);
    expect(ONBOARDING_STAGES.map((s) => s.order)).toEqual([1, 2, 3, 4, 5]);
    expect(ONBOARDING_STAGE_VALUES).toEqual([
      "WANT_TO_START",
      "HAVE_IDEA",
      "HAVE_IDEA_AND_TEAM",
      "HAVE_TEAM_AND_SOLUTION",
      "HAVE_STARTUP_OR_COMPANY",
    ]);
  });

  it("cada opção tem título e descrição em português", () => {
    for (const stage of ONBOARDING_STAGES) {
      expect(stage.title.length).toBeGreaterThan(0);
      expect(stage.description.length).toBeGreaterThan(0);
      expect(stage.icon.length).toBeGreaterThan(0);
    }
  });

  it("isValidStage aceita valores válidos e rejeita inválidos", () => {
    expect(isValidStage("HAVE_IDEA")).toBe(true);
    expect(isValidStage("INVALIDO")).toBe(false);
    expect(isValidStage(null)).toBe(false);
    expect(isValidStage(123)).toBe(false);
  });

  it("getStageOption resolve por valor", () => {
    expect(getStageOption("WANT_TO_START")?.title).toBe("Quero iniciar");
  });
});

describe("saveDraftSchema", () => {
  it("aceita estágio válido", () => {
    expect(
      saveDraftSchema.safeParse({ selectedStage: "HAVE_IDEA" }).success,
    ).toBe(true);
  });

  it("rejeita valor inválido com mensagem segura", () => {
    const result = saveDraftSchema.safeParse({ selectedStage: "FOO" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Selecione uma das opções para continuar.",
      );
    }
  });

  it("rejeita ausência de seleção", () => {
    expect(saveDraftSchema.safeParse({}).success).toBe(false);
  });
});

describe("postLoginRedirectForState", () => {
  it("sem onboarding vai para o onboarding", () => {
    expect(postLoginRedirectForState("NOT_STARTED")).toBe("/app/onboarding");
  });
  it("rascunho vai para o onboarding", () => {
    expect(postLoginRedirectForState("DRAFT")).toBe("/app/onboarding");
  });
  it("concluído vai para o painel", () => {
    expect(postLoginRedirectForState("COMPLETED")).toBe("/app");
  });
});
