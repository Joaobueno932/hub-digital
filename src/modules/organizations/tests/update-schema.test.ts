import { describe, expect, it } from "vitest";
import { updateOrganizationSchema } from "../schemas/update";

describe("updateOrganizationSchema", () => {
  it("aceita payload mínimo válido", () => {
    const parsed = updateOrganizationSchema.safeParse({
      organizationId: "8f14e45f-ceea-4a9e-8b0d-42e0f0f1b8a1",
      name: "Startup Demo",
      displayName: "",
      description: "",
      website: "",
      city: "",
      state: "",
      expectedUpdatedAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBeNull();
      expect(parsed.data.website).toBeNull();
    }
  });

  it("rejeita nome vazio", () => {
    const parsed = updateOrganizationSchema.safeParse({
      organizationId: "8f14e45f-ceea-4a9e-8b0d-42e0f0f1b8a1",
      name: "",
      expectedUpdatedAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita organizationId que não é uuid", () => {
    const parsed = updateOrganizationSchema.safeParse({
      organizationId: "not-a-uuid",
      name: "Startup Demo",
      expectedUpdatedAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita expectedUpdatedAt ausente ou malformado", () => {
    const parsed = updateOrganizationSchema.safeParse({
      organizationId: "8f14e45f-ceea-4a9e-8b0d-42e0f0f1b8a1",
      name: "Startup Demo",
      expectedUpdatedAt: "não é uma data",
    });
    expect(parsed.success).toBe(false);
  });
});
