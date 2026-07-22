/**
 * Papéis permitidos por tipo de organização. Ver docs/matriz-permissoes.md.
 * EMPRESA/MANTENEDOR/PARCEIRO ainda não têm papéis definidos — pendência
 * registrada em docs/pendencias-negocio.md; convites/trocas de papel para
 * organizações desses tipos ficam bloqueados até a definição.
 */
export const ALLOWED_ROLES_BY_ORG_TYPE: Record<string, string[]> = {
  STARTUP: ["ADM_STARTUP", "USUARIO_EQUIPE_STARTUP"],
  ESPACO_INOVACAO: ["ADM_ESPACO_INOVACAO", "USUARIO_ESPACO_INOVACAO"],
  HUB: ["ADM_HUB"],
};

/** Papel considerado "administrador" da organização, para a guarda de último admin. */
export const ADMIN_ROLE_BY_ORG_TYPE: Record<string, string> = {
  STARTUP: "ADM_STARTUP",
  ESPACO_INOVACAO: "ADM_ESPACO_INOVACAO",
  HUB: "ADM_HUB",
};

export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

export function isRoleAllowedForOrgType(
  orgTypeCode: string,
  roleCode: string,
): boolean {
  if (roleCode === SUPER_ADMIN_ROLE) return false;
  return (ALLOWED_ROLES_BY_ORG_TYPE[orgTypeCode] ?? []).includes(roleCode);
}

export function adminRoleForOrgType(orgTypeCode: string): string | null {
  return ADMIN_ROLE_BY_ORG_TYPE[orgTypeCode] ?? null;
}

/**
 * Posição de autoridade de um papel dentro do tipo de organização — índice 0
 * é a maior autoridade (o array em ALLOWED_ROLES_BY_ORG_TYPE já é ordenado
 * assim). `null` se o papel não pertence ao tipo.
 */
export function roleAuthorityRank(
  orgTypeCode: string,
  roleCode: string,
): number | null {
  const rank = (ALLOWED_ROLES_BY_ORG_TYPE[orgTypeCode] ?? []).indexOf(roleCode);
  return rank === -1 ? null : rank;
}

/**
 * Maior autoridade (menor índice) entre os papéis que o ator possui na
 * organização. `null` se o ator não tem nenhum papel reconhecido ali.
 */
export function bestAuthorityRank(
  orgTypeCode: string,
  roleCodes: string[],
): number | null {
  const ranks = roleCodes
    .map((code) => roleAuthorityRank(orgTypeCode, code))
    .filter((r): r is number => r !== null);
  return ranks.length > 0 ? Math.min(...ranks) : null;
}
