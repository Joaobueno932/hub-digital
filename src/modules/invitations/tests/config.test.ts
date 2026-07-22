import { describe, expect, it } from "vitest";
import { computeExpiresAt, INVITATION_EXPIRATION_DAYS } from "../config";

describe("computeExpiresAt", () => {
  it("adiciona INVITATION_EXPIRATION_DAYS dias à data base", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const expires = computeExpiresAt(base);
    const diffDays =
      (expires.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(INVITATION_EXPIRATION_DAYS, 5);
  });
});
