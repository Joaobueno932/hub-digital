import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("permite até o limite e bloqueia depois", () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("reinicia após a janela expirar", () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 1, -1)).toBe(true);
    // janela negativa expira imediatamente
    expect(checkRateLimit(key, 1, -1)).toBe(true);
  });
});
