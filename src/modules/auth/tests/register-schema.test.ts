import { describe, expect, it } from "vitest";
import { registerSchema } from "../schemas/register";

describe("registerSchema", () => {
  it("aceita dados válidos e normaliza o e-mail", () => {
    const result = registerSchema.parse({
      name: "Maria da Silva",
      email: "  Maria@Exemplo.com ".trim(),
      password: "senhaSegura1",
    });
    expect(result.email).toBe("maria@exemplo.com");
  });

  it("rejeita senha sem números", () => {
    const result = registerSchema.safeParse({
      name: "Maria da Silva",
      email: "maria@exemplo.com",
      password: "somenteLetras",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha curta", () => {
    const result = registerSchema.safeParse({
      name: "Maria",
      email: "maria@exemplo.com",
      password: "a1",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = registerSchema.safeParse({
      name: "Maria",
      email: "nao-e-email",
      password: "senhaSegura1",
    });
    expect(result.success).toBe(false);
  });
});
