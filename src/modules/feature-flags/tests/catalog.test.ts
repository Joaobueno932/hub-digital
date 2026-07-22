import { describe, expect, it } from "vitest";
import {
  FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  canActorChangeFlag,
  getFeatureFlagDefinition,
  isKnownFeatureFlag,
} from "@/config/feature-flags";

describe("catálogo de feature flags", () => {
  it("cobre exatamente as 13 flags da Fase 1", () => {
    expect(FEATURE_FLAG_KEYS).toHaveLength(13);
    for (const key of [
      "agenda",
      "connections",
      "mentoring",
      "evolution",
      "coworking",
      "events",
      "ideation",
      "projects",
      "trends",
      "reports",
      "academy",
      "payments",
      "external-integrations",
    ]) {
      expect(isKnownFeatureFlag(key)).toBe(true);
    }
  });

  it("toda flag tem nome, módulo e descrição preenchidos", () => {
    for (const [key, definition] of Object.entries(FEATURE_FLAGS)) {
      expect(definition.name, key).toBeTruthy();
      expect(definition.module, key).toBeTruthy();
      expect(definition.description, key).toBeTruthy();
    }
  });

  it("rejeita chave desconhecida", () => {
    expect(isKnownFeatureFlag("nao-existe")).toBe(false);
    expect(getFeatureFlagDefinition("nao-existe")).toBeNull();
    // Não confunde propriedades herdadas de Object com flags.
    expect(isKnownFeatureFlag("toString")).toBe(false);
    expect(isKnownFeatureFlag("constructor")).toBe(false);
  });
});

describe("canActorChangeFlag", () => {
  it("ADM_HUB altera flags de módulo", () => {
    for (const key of ["coworking", "events", "academy", "agenda"]) {
      expect(canActorChangeFlag(key, false)).toBe(true);
    }
  });

  it("ADM_HUB não altera payments nem external-integrations", () => {
    expect(canActorChangeFlag("payments", false)).toBe(false);
    expect(canActorChangeFlag("external-integrations", false)).toBe(false);
  });

  it("SUPER_ADMIN altera qualquer flag do catálogo", () => {
    for (const key of FEATURE_FLAG_KEYS) {
      expect(canActorChangeFlag(key, true), key).toBe(true);
    }
  });

  it("chave desconhecida nunca é alterável, nem por SUPER_ADMIN", () => {
    expect(canActorChangeFlag("nao-existe", true)).toBe(false);
    expect(canActorChangeFlag("nao-existe", false)).toBe(false);
  });
});
