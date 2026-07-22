import { describe, expect, it } from "vitest";
import { generateInvitationToken, hashInvitationToken } from "../lib/token";

describe("generateInvitationToken", () => {
  it("gera tokens únicos e com entropia suficiente", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).not.toEqual(b);
    // base64url de 32 bytes → 43 caracteres (sem padding).
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
});

describe("hashInvitationToken", () => {
  it("é determinístico para o mesmo token", () => {
    const token = "token-fixo-para-teste";
    expect(hashInvitationToken(token)).toEqual(hashInvitationToken(token));
  });

  it("produz hashes diferentes para tokens diferentes", () => {
    expect(hashInvitationToken("a")).not.toEqual(hashInvitationToken("b"));
  });

  it("nunca retorna o token em texto puro", () => {
    const token = "segredo-super-secreto";
    expect(hashInvitationToken(token)).not.toContain(token);
  });
});
