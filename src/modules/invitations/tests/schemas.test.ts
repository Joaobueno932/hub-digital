import { describe, expect, it } from "vitest";
import { createInvitationSchema, normalizeEmail } from "../schemas/create";
import {
  invitationTokenSchema,
  sanitizeInternalCallback,
} from "../schemas/decision";

describe("createInvitationSchema", () => {
  it("normaliza e-mail para minúsculas e sem espaços", () => {
    const parsed = createInvitationSchema.safeParse({
      email: "  Novo.Membro@Exemplo.COM  ",
      roleCode: "ADM_STARTUP",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("novo.membro@exemplo.com");
    }
  });

  it("rejeita e-mail inválido", () => {
    const parsed = createInvitationSchema.safeParse({
      email: "não-é-um-email",
      roleCode: "ADM_STARTUP",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita papel vazio", () => {
    const parsed = createInvitationSchema.safeParse({
      email: "a@b.com",
      roleCode: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("aplica trim, lowercase e NFKC", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("invitationTokenSchema", () => {
  it("aceita token com tamanho plausível", () => {
    expect(
      invitationTokenSchema.safeParse({ token: "a".repeat(43) }).success,
    ).toBe(true);
  });

  it("rejeita token muito curto", () => {
    expect(invitationTokenSchema.safeParse({ token: "curto" }).success).toBe(
      false,
    );
  });
});

describe("sanitizeInternalCallback", () => {
  it("aceita caminho interno", () => {
    expect(sanitizeInternalCallback("/convites/abc123")).toBe(
      "/convites/abc123",
    );
  });

  it("recusa domínio externo absoluto", () => {
    expect(sanitizeInternalCallback("https://evil.example/phish")).toBe("/app");
  });

  it("recusa caminho protocol-relative (//host)", () => {
    expect(sanitizeInternalCallback("//evil.example")).toBe("/app");
  });

  it("usa /app quando não há valor", () => {
    expect(sanitizeInternalCallback(null)).toBe("/app");
    expect(sanitizeInternalCallback(undefined)).toBe("/app");
    expect(sanitizeInternalCallback("")).toBe("/app");
  });
});
