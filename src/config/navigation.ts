/**
 * Configuração central da navegação interna.
 *
 * O filtro acontece no servidor (src/modules/permissions/services/navigation.ts).
 * Ocultar um item NUNCA substitui a autorização da rota — toda página valida
 * permissão novamente via requirePermission/requireAnyPermission.
 *
 * Para adicionar um item: inclua-o aqui com as permissões/flag/tipos de
 * organização necessários e proteja a página correspondente no servidor.
 */

export type NavGroup = "geral" | "modulos" | "administracao" | "conta";

export type NavItem = {
  label: string;
  /** Nome do ícone lucide-react resolvido no componente de menu. */
  icon: string;
  href: string;
  group: NavGroup;
  /** Chave de módulo/feature flag; item some se a flag estiver desabilitada. */
  featureFlag?: string;
  /** Usuário precisa de QUALQUER uma destas permissões (vazio = só autenticação). */
  anyPermission?: string[];
  /** Restringe a tipos de organização ativa (códigos de OrganizationType). */
  organizationTypes?: string[];
  /** Exige organização ativa (default: false). */
  requiresOrganization?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // Geral
  {
    label: "Visão geral",
    icon: "LayoutDashboard",
    href: "/app",
    group: "geral",
  },
  {
    label: "Minha organização",
    icon: "Building2",
    href: "/app/minha-organizacao",
    group: "geral",
    requiresOrganization: true,
  },
  {
    label: "Minhas solicitações",
    icon: "FileText",
    href: "/app/minhas-solicitacoes",
    group: "geral",
  },
  {
    label: "Membros",
    icon: "Users",
    href: "/app/membros",
    group: "geral",
    requiresOrganization: true,
    anyPermission: ["members.manage"],
  },
  {
    label: "Convites",
    icon: "Mail",
    href: "/app/convites",
    group: "geral",
    requiresOrganization: true,
    anyPermission: ["invitations.manage"],
  },
  {
    label: "Agenda",
    icon: "Calendar",
    href: "/app/agenda",
    group: "geral",
    featureFlag: "agenda",
  },
  {
    label: "Conexões",
    icon: "Link2",
    href: "/app/conexoes",
    group: "geral",
    featureFlag: "connections",
  },
  {
    label: "Mentorias",
    icon: "GraduationCap",
    href: "/app/mentorias",
    group: "geral",
    featureFlag: "mentoring",
  },
  {
    label: "Evolução",
    icon: "TrendingUp",
    href: "/app/evolucao",
    group: "geral",
    featureFlag: "evolution",
    organizationTypes: ["STARTUP", "EMPRESA"],
  },
  {
    label: "Planos",
    icon: "CreditCard",
    href: "/app/planos",
    group: "geral",
    anyPermission: ["plans.view"],
  },

  // Módulos (fases futuras — aparecem apenas com flag habilitada)
  {
    label: "Coworking",
    icon: "Armchair",
    href: "/app/coworking",
    group: "modulos",
    featureFlag: "coworking",
  },
  {
    label: "Eventos",
    icon: "PartyPopper",
    href: "/app/eventos",
    group: "modulos",
    featureFlag: "events",
  },
  {
    label: "Ideação",
    icon: "Lightbulb",
    href: "/app/ideacao",
    group: "modulos",
    featureFlag: "ideation",
  },
  {
    label: "Projetos",
    icon: "FolderKanban",
    href: "/app/projetos",
    group: "modulos",
    featureFlag: "projects",
  },
  {
    label: "Tendências e negócios",
    icon: "ChartLine",
    href: "/app/tendencias",
    group: "modulos",
    featureFlag: "trends",
  },
  {
    label: "Relatórios",
    icon: "FileChartColumn",
    href: "/app/relatorios",
    group: "modulos",
    featureFlag: "reports",
  },
  {
    label: "Academy",
    icon: "BookOpen",
    href: "/app/academy",
    group: "modulos",
    featureFlag: "academy",
  },

  // Administração
  {
    label: "Administração",
    icon: "ShieldCheck",
    href: "/app/admin",
    group: "administracao",
    anyPermission: [
      "users.list",
      "organizations.list",
      "registrations.list",
      "roles.manage",
      "permissions.manage",
      "audit.view",
      "feature-flags.manage",
    ],
  },

  // Conta
  {
    label: "Configurações",
    icon: "Settings",
    href: "/app/configuracoes",
    group: "conta",
  },
];
