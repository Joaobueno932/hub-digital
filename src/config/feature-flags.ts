/**
 * Catálogo central das feature flags — fonte de verdade para **validação**.
 *
 * O banco (`FeatureFlag`) guarda apenas o *estado* (ligada/desligada, global ou
 * por organização). Nome, módulo e sensibilidade vivem aqui, versionados em
 * código: nenhuma chave vinda de formulário é aceita sem existir neste
 * catálogo, então o cliente não consegue criar flags arbitrárias.
 *
 * Mesma abordagem de `src/modules/memberships/config/role-matrix.ts` (Etapa 1.8).
 * Para adicionar uma flag: registre aqui, semeie em `prisma/seed.ts` e, se ela
 * controlar uma rota, use `requireFeature` na página.
 */

export type FeatureFlagDefinition = {
  /** Rótulo exibido na administração. */
  name: string;
  /** Código do `Module` correspondente (ou `portal` para recursos transversais). */
  module: string;
  description: string;
  /**
   * Só SUPER_ADMIN altera. Reservado a flags com efeito financeiro ou de
   * integração externa, onde um erro de ADM_HUB teria impacto fora da
   * plataforma — ver docs/decisoes-tecnicas.md.
   */
  superAdminOnly: boolean;
};

export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  agenda: {
    name: "Agenda",
    module: "portal",
    description: "Agenda compartilhada do ecossistema.",
    superAdminOnly: false,
  },
  connections: {
    name: "Conexões",
    module: "portal",
    description: "Conexões entre pessoas e organizações.",
    superAdminOnly: false,
  },
  mentoring: {
    name: "Mentorias",
    module: "portal",
    description: "Programas de mentoria.",
    superAdminOnly: false,
  },
  evolution: {
    name: "Evolução",
    module: "projects",
    description: "Acompanhamento de evolução da startup.",
    superAdminOnly: false,
  },
  coworking: {
    name: "Coworking",
    module: "coworking",
    description: "Reserva de salas e espaços de coworking.",
    superAdminOnly: false,
  },
  events: {
    name: "Eventos",
    module: "events",
    description: "Eventos e comunidade.",
    superAdminOnly: false,
  },
  ideation: {
    name: "Ideação",
    module: "ideation",
    description: "Campanhas e desafios de inovação.",
    superAdminOnly: false,
  },
  projects: {
    name: "Gestão de Projetos",
    module: "projects",
    description: "Planos de trabalho e aceleração.",
    superAdminOnly: false,
  },
  trends: {
    name: "Tendências e Negócios",
    module: "trends",
    description: "Painéis de tendências e inteligência de mercado.",
    superAdminOnly: false,
  },
  reports: {
    name: "Relatórios",
    module: "trends",
    description: "Relatórios comercializáveis.",
    superAdminOnly: false,
  },
  academy: {
    name: "Academy",
    module: "academy",
    description: "Conteúdos educacionais.",
    superAdminOnly: false,
  },
  payments: {
    name: "Pagamentos",
    module: "portal",
    description: "Cobrança e assinaturas (gateway externo).",
    superAdminOnly: true,
  },
  "external-integrations": {
    name: "Integrações externas",
    module: "portal",
    description: "Integrações com Sympla, BI, LMS e demais sistemas externos.",
    superAdminOnly: true,
  },
};

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS);

export function isKnownFeatureFlag(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAGS, key);
}

export function getFeatureFlagDefinition(
  key: string,
): FeatureFlagDefinition | null {
  return isKnownFeatureFlag(key) ? FEATURE_FLAGS[key] : null;
}

/** Só SUPER_ADMIN altera flags marcadas como sensíveis. */
export function canActorChangeFlag(
  key: string,
  actorIsSuperAdmin: boolean,
): boolean {
  const definition = getFeatureFlagDefinition(key);
  if (!definition) return false;
  return actorIsSuperAdmin || !definition.superAdminOnly;
}
