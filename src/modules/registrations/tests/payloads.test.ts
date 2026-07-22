import { describe, expect, it } from "vitest";
import { parseRegistrationPayload } from "../schemas/payloads";
import { rejectInputSchema } from "../schemas/decision";

describe("parseRegistrationPayload", () => {
  it("valida payload de startup", () => {
    const result = parseRegistrationPayload("STARTUP", {
      organizationName: "Startup X",
      contactName: "Maria",
      contactEmail: "maria@exemplo.com",
    });
    expect(result.ok).toBe(true);
  });

  it("valida payload de usuário", () => {
    const result = parseRegistrationPayload("USER", {
      contactName: "João",
      contactEmail: "joao@exemplo.com",
    });
    expect(result.ok).toBe(true);
  });

  it("rejeita payload legado/inválido com estado seguro", () => {
    const result = parseRegistrationPayload("STARTUP", { legacy: true });
    expect(result.ok).toBe(false);
  });

  it("rejeita tipo desconhecido", () => {
    const result = parseRegistrationPayload("OUTRO", {});
    expect(result.ok).toBe(false);
  });
});

describe("rejectInputSchema", () => {
  const requestId = "5f0e7f34-9adb-4ab2-96a3-8ff23c4cf0a1";

  it("exige justificativa com mínimo de 10 caracteres após trim", () => {
    expect(
      rejectInputSchema.safeParse({ requestId, reason: "   curta   " }).success,
    ).toBe(false);
    expect(
      rejectInputSchema.safeParse({
        requestId,
        reason: "  justificativa válida  ",
      }).success,
    ).toBe(true);
  });

  it("rejeita justificativa vazia e acima do limite", () => {
    expect(rejectInputSchema.safeParse({ requestId, reason: "" }).success).toBe(
      false,
    );
    expect(
      rejectInputSchema.safeParse({ requestId, reason: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
});
