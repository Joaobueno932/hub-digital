import { describe, expect, it } from "vitest";
import {
  reactivateUserSchema,
  suspendUserSchema,
  updateUserSchema,
} from "../schemas/update";

const UUID = "8f14e45f-ceea-4a9e-8b0d-42e0f0f1b8a1";

describe("updateUserSchema", () => {
  it("aceita nome válido com OCC", () => {
    const parsed = updateUserSchema.safeParse({
      userId: UUID,
      name: "Maria Silva",
      expectedUpdatedAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita nome muito curto e userId inválido", () => {
    expect(
      updateUserSchema.safeParse({
        userId: UUID,
        name: "A",
        expectedUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
    expect(
      updateUserSchema.safeParse({
        userId: "nao-e-uuid",
        name: "Maria Silva",
        expectedUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });

  it("não aceita e-mail, senha, status nem papéis (campos não editáveis)", () => {
    const parsed = updateUserSchema.safeParse({
      userId: UUID,
      name: "Maria Silva",
      expectedUpdatedAt: new Date().toISOString(),
      email: "novo@exemplo.com",
      password: "secret",
      status: "ACTIVE",
      roleCode: "SUPER_ADMIN",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // O schema descarta o que não é editável — nada disso chega ao serviço.
      expect(Object.keys(parsed.data).sort()).toEqual([
        "expectedUpdatedAt",
        "name",
        "userId",
      ]);
    }
  });
});

describe("suspendUserSchema", () => {
  it("exige motivo com pelo menos 10 caracteres", () => {
    expect(
      suspendUserSchema.safeParse({ userId: UUID, reason: "curto" }).success,
    ).toBe(false);
    expect(
      suspendUserSchema.safeParse({
        userId: UUID,
        reason: "Violação reiterada dos termos de uso.",
      }).success,
    ).toBe(true);
  });

  it("faz trim do motivo", () => {
    const parsed = suspendUserSchema.safeParse({
      userId: UUID,
      reason: "   Motivo suficientemente longo.   ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data.reason).toBe("Motivo suficientemente longo.");
  });
});

describe("reactivateUserSchema", () => {
  it("exige userId uuid", () => {
    expect(reactivateUserSchema.safeParse({ userId: UUID }).success).toBe(true);
    expect(reactivateUserSchema.safeParse({ userId: "x" }).success).toBe(false);
  });
});
