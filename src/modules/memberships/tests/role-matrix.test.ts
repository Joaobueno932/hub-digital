import { describe, expect, it } from "vitest";
import {
  ALLOWED_ROLES_BY_ORG_TYPE,
  adminRoleForOrgType,
  isRoleAllowedForOrgType,
  SUPER_ADMIN_ROLE,
} from "../config/role-matrix";

describe("isRoleAllowedForOrgType", () => {
  it("permite papéis do tipo correto", () => {
    expect(isRoleAllowedForOrgType("STARTUP", "ADM_STARTUP")).toBe(true);
    expect(isRoleAllowedForOrgType("STARTUP", "USUARIO_EQUIPE_STARTUP")).toBe(
      true,
    );
    expect(
      isRoleAllowedForOrgType("ESPACO_INOVACAO", "ADM_ESPACO_INOVACAO"),
    ).toBe(true);
  });

  it("rejeita papel de outro tipo de organização", () => {
    expect(isRoleAllowedForOrgType("STARTUP", "ADM_ESPACO_INOVACAO")).toBe(
      false,
    );
    expect(isRoleAllowedForOrgType("ESPACO_INOVACAO", "ADM_STARTUP")).toBe(
      false,
    );
  });

  it("nunca permite SUPER_ADMIN via esta função, mesmo para HUB", () => {
    expect(isRoleAllowedForOrgType("HUB", SUPER_ADMIN_ROLE)).toBe(false);
  });

  it("tipos sem papéis definidos (EMPRESA/MANTENEDOR/PARCEIRO) não permitem nenhum papel", () => {
    expect(isRoleAllowedForOrgType("EMPRESA", "ADM_STARTUP")).toBe(false);
    expect(ALLOWED_ROLES_BY_ORG_TYPE["EMPRESA"]).toBeUndefined();
  });
});

describe("adminRoleForOrgType", () => {
  it("retorna o papel administrador de cada tipo conhecido", () => {
    expect(adminRoleForOrgType("STARTUP")).toBe("ADM_STARTUP");
    expect(adminRoleForOrgType("ESPACO_INOVACAO")).toBe("ADM_ESPACO_INOVACAO");
    expect(adminRoleForOrgType("HUB")).toBe("ADM_HUB");
  });

  it("retorna null para tipos sem papel administrador definido", () => {
    expect(adminRoleForOrgType("EMPRESA")).toBeNull();
  });
});
