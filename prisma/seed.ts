import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OnboardingStage } from "../src/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Credenciais exclusivamente de desenvolvimento — documentadas no README.
const DEV_PASSWORD = "HubDigital@dev1";

const ROLES = [
  { code: "SUPER_ADMIN", name: "Super administrador", isSystem: true },
  { code: "ADM_HUB", name: "Administrador do Hub", isSystem: true },
  {
    code: "ADM_ESPACO_INOVACAO",
    name: "Administrador de espaço de inovação",
    isSystem: true,
  },
  {
    code: "USUARIO_ESPACO_INOVACAO",
    name: "Colaborador de espaço de inovação",
    isSystem: true,
  },
  { code: "ADM_STARTUP", name: "Administrador de startup", isSystem: true },
  {
    code: "USUARIO_EQUIPE_STARTUP",
    name: "Membro de equipe de startup",
    isSystem: true,
  },
  { code: "USUARIO_COMUM", name: "Usuário comum", isSystem: true },
] as const;

// Permissões da Fase 1 — ver docs/matriz-permissoes.md
const PERMISSIONS: Array<{
  code: string;
  module: string;
  description: string;
}> = [
  { code: "users.list", module: "users", description: "Listar usuários" },
  { code: "users.view", module: "users", description: "Visualizar usuário" },
  { code: "users.create", module: "users", description: "Cadastrar usuário" },
  { code: "users.update", module: "users", description: "Editar usuário" },
  {
    code: "users.deactivate",
    module: "users",
    description: "Desativar usuário",
  },
  {
    code: "registrations.list",
    module: "registrations",
    description: "Listar solicitações de cadastro",
  },
  {
    code: "registrations.view",
    module: "registrations",
    description: "Visualizar solicitação de cadastro",
  },
  {
    code: "registrations.approve",
    module: "registrations",
    description: "Aprovar solicitação de cadastro",
  },
  {
    code: "registrations.reject",
    module: "registrations",
    description: "Reprovar solicitação de cadastro",
  },
  {
    code: "organizations.list",
    module: "organizations",
    description: "Listar organizações",
  },
  {
    code: "organizations.view",
    module: "organizations",
    description: "Visualizar organização",
  },
  {
    code: "organizations.create",
    module: "organizations",
    description: "Criar organização",
  },
  {
    code: "organizations.update",
    module: "organizations",
    description: "Editar organização",
  },
  {
    code: "organizations.update.own",
    module: "organizations",
    description: "Editar a própria organização",
  },
  {
    code: "members.manage",
    module: "memberships",
    description: "Gerenciar membros da organização",
  },
  {
    code: "invitations.manage",
    module: "memberships",
    description: "Gerenciar convites de membros",
  },
  {
    code: "roles.manage",
    module: "permissions",
    description: "Gerenciar papéis",
  },
  {
    code: "permissions.manage",
    module: "permissions",
    description: "Gerenciar permissões",
  },
  { code: "plans.manage", module: "plans", description: "Gerenciar planos" },
  { code: "plans.view", module: "plans", description: "Visualizar planos" },
  {
    code: "feature-flags.manage",
    module: "feature-flags",
    description: "Gerenciar feature flags",
  },
  { code: "audit.view", module: "audit", description: "Visualizar auditoria" },
  {
    code: "notifications.view.own",
    module: "notifications",
    description: "Ver as próprias notificações",
  },
  {
    code: "onboarding.complete.own",
    module: "onboarding",
    description: "Realizar o próprio onboarding",
  },
  {
    code: "dashboard.view",
    module: "portal",
    description: "Acessar o painel interno",
  },
];

const ALL = PERMISSIONS.map((p) => p.code);
const COMMON = [
  "plans.view",
  "notifications.view.own",
  "onboarding.complete.own",
  "dashboard.view",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL,
  ADM_HUB: ALL.filter((c) => c !== "organizations.update.own"),
  // Administração de PESSOAS do espaço acontece em /app/membros via
  // `members.manage` (escopada ao vínculo). As permissões `users.*` são de
  // administração da PLATAFORMA (global) e por isso não pertencem a papéis
  // organizacionais — ver docs/matriz-permissoes.md.
  ADM_ESPACO_INOVACAO: [
    ...COMMON,
    "organizations.update.own",
    "members.manage",
    "invitations.manage",
  ],
  USUARIO_ESPACO_INOVACAO: [...COMMON],
  ADM_STARTUP: [
    ...COMMON,
    "organizations.update.own",
    "members.manage",
    "invitations.manage",
  ],
  USUARIO_EQUIPE_STARTUP: [...COMMON],
  USUARIO_COMUM: [...COMMON],
};

const ORG_TYPES = [
  { code: "HUB", name: "Hub Digital" },
  { code: "ESPACO_INOVACAO", name: "Espaço de Inovação" },
  { code: "STARTUP", name: "Startup" },
  { code: "EMPRESA", name: "Empresa" },
  { code: "MANTENEDOR", name: "Mantenedor" },
  { code: "PARCEIRO", name: "Parceiro" },
];

const MODULES = [
  { code: "portal", name: "Portal", order: 1 },
  { code: "coworking", name: "Coworking", order: 2 },
  { code: "events", name: "Eventos e comunidade", order: 3 },
  { code: "ideation", name: "Ideação", order: 4 },
  { code: "projects", name: "Gestão de Projetos", order: 5 },
  { code: "trends", name: "Tendências e Negócios", order: 6 },
  { code: "academy", name: "Academy", order: 7 },
];

const FLAGS = [
  "agenda",
  "connections",
  "mentoring",
  "evolution",
  "coworking",
  "events",
  "ideation",
  "projects",
  "trends",
  "reports",
  "academy",
  "payments",
  "external-integrations",
];

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  for (const t of ORG_TYPES) {
    await prisma.organizationType.upsert({
      where: { code: t.code },
      update: { name: t.name },
      create: t,
    });
  }
  for (const m of MODULES) {
    await prisma.module.upsert({
      where: { code: m.code },
      update: m,
      create: m,
    });
  }
  for (const key of FLAGS) {
    const existing = await prisma.featureFlag.findFirst({
      where: { key, organizationId: null },
    });
    if (!existing) {
      await prisma.featureFlag.create({
        data: {
          key,
          enabled: false,
          description: `Módulo/recurso ${key} (em preparação)`,
        },
      });
    }
  }
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
    const codes = ROLE_PERMISSIONS[r.code] ?? [];
    const perms = await prisma.permission.findMany({
      where: { code: { in: codes } },
    });
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    // ROLE_PERMISSIONS é a fonte de verdade: revoga o que saiu do mapa. Sem
    // isso, uma permissão removida (ex.: `users.*` de papéis organizacionais)
    // continuaria concedida em bancos já semeados.
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: perms.map((p) => p.id) },
      },
    });
  }

  const typeByCode = Object.fromEntries(
    (await prisma.organizationType.findMany()).map((t) => [t.code, t.id]),
  );

  const orgs = [
    { name: "Hub Digital", slug: "hub-digital", type: "HUB" },
    {
      name: "Espaço de Inovação Centro",
      slug: "espaco-inovacao-centro",
      type: "ESPACO_INOVACAO",
    },
    { name: "Startup Demo Aurora", slug: "startup-aurora", type: "STARTUP" },
  ];
  const orgBySlug: Record<string, string> = {};
  for (const o of orgs) {
    const org = await prisma.organization.upsert({
      where: { slug: o.slug },
      update: { status: "ACTIVE" },
      create: {
        name: o.name,
        slug: o.slug,
        typeId: typeByCode[o.type],
        status: "ACTIVE",
      },
    });
    orgBySlug[o.slug] = org.id;
  }

  const users: Array<{
    email: string;
    name: string;
    role: string;
    org?: string;
  }> = [
    {
      email: "superadmin@dev.hubdigital.local",
      name: "Super Admin Dev",
      role: "SUPER_ADMIN",
      org: "hub-digital",
    },
    {
      email: "admhub@dev.hubdigital.local",
      name: "Administração do Hub",
      role: "ADM_HUB",
      org: "hub-digital",
    },
    {
      email: "admespaco@dev.hubdigital.local",
      name: "Gestora do Espaço",
      role: "ADM_ESPACO_INOVACAO",
      org: "espaco-inovacao-centro",
    },
    {
      email: "usuarioespaco@dev.hubdigital.local",
      name: "Colaborador do Espaço",
      role: "USUARIO_ESPACO_INOVACAO",
      org: "espaco-inovacao-centro",
    },
    {
      email: "admstartup@dev.hubdigital.local",
      name: "Fundadora da Aurora",
      role: "ADM_STARTUP",
      org: "startup-aurora",
    },
    {
      email: "equipestartup@dev.hubdigital.local",
      name: "Time da Aurora",
      role: "USUARIO_EQUIPE_STARTUP",
      org: "startup-aurora",
    },
    {
      email: "comum@dev.hubdigital.local",
      name: "Usuário Comum",
      role: "USUARIO_COMUM",
    },
  ];

  // Usuário com vínculo em duas organizações, para validar a troca de contexto.
  const multiOrgLinks: Array<{ email: string; org: string; role: string }> = [
    {
      email: "multi@dev.hubdigital.local",
      org: "espaco-inovacao-centro",
      role: "USUARIO_ESPACO_INOVACAO",
    },
    {
      email: "multi@dev.hubdigital.local",
      org: "startup-aurora",
      role: "ADM_STARTUP",
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { status: "ACTIVE" },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    if (u.org) {
      const membership = await prisma.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: orgBySlug[u.org],
          },
        },
        update: { status: "ACTIVE" },
        create: {
          userId: user.id,
          organizationId: orgBySlug[u.org],
          status: "ACTIVE",
        },
      });
      const role = await prisma.role.findUniqueOrThrow({
        where: { code: u.role },
      });
      await prisma.membershipRole.upsert({
        where: {
          membershipId_roleId: { membershipId: membership.id, roleId: role.id },
        },
        update: {},
        create: { membershipId: membership.id, roleId: role.id },
      });
    }
  }

  const multiUser = await prisma.user.upsert({
    where: { email: "multi@dev.hubdigital.local" },
    update: { status: "ACTIVE" },
    create: {
      email: "multi@dev.hubdigital.local",
      name: "Usuária Multiorganização",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  for (const link of multiOrgLinks) {
    const membership = await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: multiUser.id,
          organizationId: orgBySlug[link.org],
        },
      },
      update: { status: "ACTIVE" },
      create: {
        userId: multiUser.id,
        organizationId: orgBySlug[link.org],
        status: "ACTIVE",
      },
    });
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: link.role },
    });
    await prisma.membershipRole.upsert({
      where: {
        membershipId_roleId: { membershipId: membership.id, roleId: role.id },
      },
      update: {},
      create: { membershipId: membership.id, roleId: role.id },
    });
  }

  // --- Onboarding (Etapa 1.6) ---
  // Usuários dos fluxos E2E existentes ficam COMPLETED para não serem
  // redirecionados ao onboarding (mantém os testes atuais estáveis).
  const completedOnboardingEmails = [
    "superadmin@dev.hubdigital.local",
    "admhub@dev.hubdigital.local",
    "admespaco@dev.hubdigital.local",
    "usuarioespaco@dev.hubdigital.local",
    "admstartup@dev.hubdigital.local",
    "equipestartup@dev.hubdigital.local",
    "comum@dev.hubdigital.local",
    "multi@dev.hubdigital.local",
  ];
  for (const email of completedOnboardingEmails) {
    const u = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.onboardingProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        status: "COMPLETED",
        selectedStage: "HAVE_STARTUP_OR_COMPANY",
        completedAt: new Date(),
      },
    });
  }

  // Usuários dedicados aos testes de onboarding.
  const onboardingUsers: Array<{
    email: string;
    name: string;
    state: "NONE" | "DRAFT" | "COMPLETED";
    stage?: OnboardingStage;
  }> = [
    {
      email: "onb.none@dev.hubdigital.local",
      name: "Onboarding Não Iniciado",
      state: "NONE",
    },
    {
      email: "onb.flow@dev.hubdigital.local",
      name: "Onboarding Fluxo E2E",
      state: "NONE",
    },
    {
      email: "onb.draft@dev.hubdigital.local",
      name: "Onboarding Rascunho",
      state: "DRAFT",
      stage: "HAVE_IDEA",
    },
    {
      email: "onb.done@dev.hubdigital.local",
      name: "Onboarding Concluído",
      state: "COMPLETED",
      stage: "HAVE_TEAM_AND_SOLUTION",
    },
  ];
  for (const ou of onboardingUsers) {
    const u = await prisma.user.upsert({
      where: { email: ou.email },
      update: { status: "ACTIVE" },
      create: {
        email: ou.email,
        name: ou.name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    if (ou.state === "DRAFT" && ou.stage) {
      await prisma.onboardingProfile.upsert({
        where: { userId: u.id },
        update: { status: "DRAFT", selectedStage: ou.stage },
        create: { userId: u.id, status: "DRAFT", selectedStage: ou.stage },
      });
    } else if (ou.state === "COMPLETED" && ou.stage) {
      await prisma.onboardingProfile.upsert({
        where: { userId: u.id },
        update: {},
        create: {
          userId: u.id,
          status: "COMPLETED",
          selectedStage: ou.stage,
          completedAt: new Date(),
        },
      });
      const hasNotif = await prisma.notification.findFirst({
        where: { userId: u.id, type: "onboarding.completed" },
      });
      if (!hasNotif) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: "onboarding.completed",
            title: "Perfil inicial concluído",
            body: "Seu estágio no Hub Digital foi registrado com sucesso.",
            link: "/app/onboarding/concluido",
          },
        });
      }
    }
  }

  // --- Solicitações institucionais (Etapa 1.7) ---
  // Usuários dedicados, com onboarding concluído (não vão ao onboarding no login).
  async function makeRequestUser(email: string, name: string) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { status: "ACTIVE" },
      create: {
        email,
        name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    await prisma.onboardingProfile.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        status: "COMPLETED",
        selectedStage: "HAVE_STARTUP_OR_COMPANY",
        completedAt: new Date(),
      },
    });
    return u;
  }

  async function makeRequest(
    marker: string,
    data: Parameters<typeof prisma.registrationRequest.create>[0]["data"],
  ) {
    const exists = await prisma.registrationRequest.findFirst({
      where: { payload: { path: ["seedMarker"], equals: marker } },
    });
    if (!exists) await prisma.registrationRequest.create({ data });
  }

  const reqAdmHub = await prisma.user.findUniqueOrThrow({
    where: { email: "admhub@dev.hubdigital.local" },
  });
  const reqStartupNew = await makeRequestUser(
    "req.startup.new@dev.hubdigital.local",
    "Solicitante Startup",
  );
  const reqEspacoNew = await makeRequestUser(
    "req.espaco.new@dev.hubdigital.local",
    "Solicitante Espaço",
  );
  const reqMobile = await makeRequestUser(
    "req.mobile@dev.hubdigital.local",
    "Solicitante Mobile",
  );
  void reqMobile;
  const reqPending = await makeRequestUser(
    "req.pending@dev.hubdigital.local",
    "Solicitante Pendente",
  );
  const reqApproved = await makeRequestUser(
    "req.approved@dev.hubdigital.local",
    "Solicitante Aprovado",
  );
  const reqRejected = await makeRequestUser(
    "req.rejected@dev.hubdigital.local",
    "Solicitante Reprovado",
  );
  void reqStartupNew;
  void reqEspacoNew;

  const orgContact = {
    contactName: "Solicitante Pendente",
    contactEmail: "req.pending@dev.hubdigital.local",
    city: "Campo Grande",
    state: "MS",
    source: "public_form",
    schemaVersion: 1,
  };

  // Usuário com dois tipos distintos PENDENTES (permitido).
  await makeRequest("req-pending-startup", {
    type: "STARTUP",
    requesterId: reqPending.id,
    payload: {
      seedMarker: "req-pending-startup",
      organizationName: "Startup Pendente Demo",
      description: "Startup de demonstração em análise.",
      stage: "HAVE_IDEA_AND_TEAM",
      ...orgContact,
    },
    status: "PENDING",
  });
  await makeRequest("req-pending-espaco", {
    type: "ESPACO_INOVACAO",
    requesterId: reqPending.id,
    payload: {
      seedMarker: "req-pending-espaco",
      organizationName: "Espaço Pendente Demo",
      description: "Espaço de inovação em análise.",
      institution: "Instituição Demo",
      ...orgContact,
    },
    status: "PENDING",
  });

  // Solicitação APROVADA, com organização e vínculo resultantes.
  const approvedOrg = await prisma.organization.upsert({
    where: { slug: "startup-aprovada-demo" },
    update: { status: "ACTIVE" },
    create: {
      name: "Startup Aprovada Demo",
      slug: "startup-aprovada-demo",
      typeId: typeByCode["STARTUP"],
      status: "ACTIVE",
      createdById: reqAdmHub.id,
    },
  });
  const approvedMembership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: reqApproved.id,
        organizationId: approvedOrg.id,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      userId: reqApproved.id,
      organizationId: approvedOrg.id,
      status: "ACTIVE",
    },
  });
  const admStartupRole = await prisma.role.findUniqueOrThrow({
    where: { code: "ADM_STARTUP" },
  });
  await prisma.membershipRole.upsert({
    where: {
      membershipId_roleId: {
        membershipId: approvedMembership.id,
        roleId: admStartupRole.id,
      },
    },
    update: {},
    create: { membershipId: approvedMembership.id, roleId: admStartupRole.id },
  });
  await makeRequest("req-approved-startup", {
    type: "STARTUP",
    requesterId: reqApproved.id,
    payload: {
      seedMarker: "req-approved-startup",
      organizationName: "Startup Aprovada Demo",
      description: "Startup de demonstração já aprovada.",
      contactName: "Solicitante Aprovado",
      contactEmail: "req.approved@dev.hubdigital.local",
      city: "Dourados",
      state: "MS",
      source: "public_form",
      schemaVersion: 1,
    },
    status: "APPROVED",
    decidedById: reqAdmHub.id,
    decidedAt: new Date(),
    resultingOrganizationId: approvedOrg.id,
    resultingMembershipId: approvedMembership.id,
  });

  // Solicitação REPROVADA, com justificativa.
  await makeRequest("req-rejected-espaco", {
    type: "ESPACO_INOVACAO",
    requesterId: reqRejected.id,
    payload: {
      seedMarker: "req-rejected-espaco",
      organizationName: "Espaço Reprovado Institucional",
      description: "Espaço de demonstração reprovado.",
      contactName: "Solicitante Reprovado",
      contactEmail: "req.rejected@dev.hubdigital.local",
      city: "Três Lagoas",
      state: "MS",
      source: "public_form",
      schemaVersion: 1,
    },
    status: "REJECTED",
    decidedById: reqAdmHub.id,
    decidedAt: new Date(),
    decisionReason: "Dados insuficientes para análise (demonstração).",
  });

  const plans = [
    {
      name: "Plano Comunidade",
      slug: "comunidade",
      description:
        "Acesso gratuito a conteúdos e eventos abertos (demonstração).",
      priceCents: 0,
      billingPeriod: "MONTHLY" as const,
    },
    {
      name: "Plano Conecta",
      slug: "conecta",
      description:
        "Plano de demonstração com acesso ampliado (valores pendentes de confirmação).",
      priceCents: null,
      billingPeriod: "MONTHLY" as const,
    },
    {
      name: "Plano Acelera",
      slug: "acelera",
      description:
        "Plano de demonstração para startups em aceleração (valores pendentes de confirmação).",
      priceCents: null,
      billingPeriod: "YEARLY" as const,
    },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  const admHub = await prisma.user.findUniqueOrThrow({
    where: { email: "admhub@dev.hubdigital.local" },
  });
  const comum = await prisma.user.findUniqueOrThrow({
    where: { email: "comum@dev.hubdigital.local" },
  });

  // Idempotente por seedMarker (não depender de contagem global — outros
  // blocos criam solicitações antes deste ponto).
  const horizonteExists = await prisma.registrationRequest.findFirst({
    where: {
      payload: { path: ["seedMarker"], equals: "seed-startup-horizonte" },
    },
  });
  if (!horizonteExists) {
    await prisma.registrationRequest.create({
      data: {
        type: "STARTUP",
        requesterId: comum.id,
        payload: {
          seedMarker: "seed-startup-horizonte",
          organizationName: "Startup Horizonte",
          contactName: "Usuário Comum",
          contactEmail: "comum@dev.hubdigital.local",
          contactPhone: "(67) 99999-0000",
        },
        status: "PENDING",
      },
    });
  }
  const norteExists = await prisma.registrationRequest.findFirst({
    where: { payload: { path: ["seedMarker"], equals: "seed-espaco-norte" } },
  });
  if (!norteExists) {
    await prisma.registrationRequest.create({
      data: {
        type: "ESPACO_INOVACAO",
        payload: {
          seedMarker: "seed-espaco-norte",
          organizationName: "Espaço Inovação Norte",
          contactName: "Solicitante Externo",
          contactEmail: "espaco.norte@dev.hubdigital.local",
        },
        status: "PENDING",
      },
    });
  }

  // Cenários adicionais para a Etapa 1.5 (idempotentes via seedMarker no payload).
  const superadmin = await prisma.user.findUniqueOrThrow({
    where: { email: "superadmin@dev.hubdigital.local" },
  });
  const scenarioRequests: Array<{
    marker: string;
    data: Parameters<typeof prisma.registrationRequest.create>[0]["data"];
  }> = [
    {
      marker: "seed-user-pending",
      data: {
        type: "USER",
        requesterId: comum.id,
        payload: {
          seedMarker: "seed-user-pending",
          contactName: "Usuário Comum",
          contactEmail: "comum@dev.hubdigital.local",
        },
        status: "PENDING",
      },
    },
    {
      marker: "seed-approved",
      data: {
        type: "STARTUP",
        requesterId: comum.id,
        payload: {
          seedMarker: "seed-approved",
          organizationName: "Startup Já Aprovada",
          contactName: "Usuário Comum",
          contactEmail: "comum@dev.hubdigital.local",
        },
        status: "APPROVED",
        decidedById: admHub.id,
        decidedAt: new Date(),
      },
    },
    {
      marker: "seed-rejected",
      data: {
        type: "ESPACO_INOVACAO",
        requesterId: comum.id,
        payload: {
          seedMarker: "seed-rejected",
          organizationName: "Espaço Reprovado Demo",
          contactName: "Usuário Comum",
          contactEmail: "comum@dev.hubdigital.local",
        },
        status: "REJECTED",
        decidedById: admHub.id,
        decidedAt: new Date(),
        decisionReason: "Documentação incompleta (dados de demonstração).",
      },
    },
    {
      marker: "seed-self-review",
      data: {
        type: "STARTUP",
        requesterId: superadmin.id,
        payload: {
          seedMarker: "seed-self-review",
          organizationName: "Startup do Próprio Admin",
          contactName: "Super Admin Dev",
          contactEmail: "superadmin@dev.hubdigital.local",
        },
        status: "PENDING",
      },
    },
    {
      marker: "seed-invalid-payload",
      data: {
        type: "STARTUP",
        requesterId: comum.id,
        payload: { seedMarker: "seed-invalid-payload", legacy: true },
        status: "PENDING",
      },
    },
  ];
  for (const scenario of scenarioRequests) {
    const exists = await prisma.registrationRequest.findFirst({
      where: { payload: { path: ["seedMarker"], equals: scenario.marker } },
    });
    if (!exists) {
      await prisma.registrationRequest.create({ data: scenario.data });
    }
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: admHub.id,
        type: "registration.pending",
        title: "Novas solicitações de cadastro",
        body: "Existem solicitações de cadastro aguardando análise.",
        link: "/app/admin/cadastros",
      },
      {
        userId: comum.id,
        type: "welcome",
        title: "Boas-vindas ao Hub Digital",
        body: "Complete o seu onboarding para personalizarmos a sua experiência.",
        link: "/app/onboarding",
      },
    ],
  });

  // --- Etapa 1.8: organizações, membros e convites (idempotente) ---
  const admStartup = await prisma.user.findUniqueOrThrow({
    where: { email: "admstartup@dev.hubdigital.local" },
  });
  const equipeStartup = await prisma.user.findUniqueOrThrow({
    where: { email: "equipestartup@dev.hubdigital.local" },
  });
  const admStartupRoleRow = await prisma.role.findUniqueOrThrow({
    where: { code: "ADM_STARTUP" },
  });
  const equipeRoleRow = await prisma.role.findUniqueOrThrow({
    where: { code: "USUARIO_EQUIPE_STARTUP" },
  });

  // Organização com um único administrador ativo — usada para testar o
  // bloqueio de remoção/suspensão do último administrador.
  const soloOrg = await prisma.organization.upsert({
    where: { slug: "startup-solo-admin" },
    update: { status: "ACTIVE" },
    create: {
      name: "Startup Admin Único",
      slug: "startup-solo-admin",
      typeId: typeByCode["STARTUP"],
      status: "ACTIVE",
      description:
        "Cenário de teste: organização com apenas um administrador ativo.",
    },
  });
  const soloAdminUser = await prisma.user.upsert({
    where: { email: "solo.admin@dev.hubdigital.local" },
    update: { status: "ACTIVE" },
    create: {
      email: "solo.admin@dev.hubdigital.local",
      name: "Admin Único Demo",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  await prisma.onboardingProfile.upsert({
    where: { userId: soloAdminUser.id },
    update: {},
    create: {
      userId: soloAdminUser.id,
      status: "COMPLETED",
      selectedStage: "HAVE_STARTUP_OR_COMPANY",
      completedAt: new Date(),
    },
  });
  const soloMembership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: soloAdminUser.id,
        organizationId: soloOrg.id,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      userId: soloAdminUser.id,
      organizationId: soloOrg.id,
      status: "ACTIVE",
    },
  });
  await prisma.membershipRole.upsert({
    where: {
      membershipId_roleId: {
        membershipId: soloMembership.id,
        roleId: admStartupRoleRow.id,
      },
    },
    update: {},
    create: { membershipId: soloMembership.id, roleId: admStartupRoleRow.id },
  });

  // Membro suspenso em startup-aurora (organização com vários membros).
  const suspendedUser = await prisma.user.upsert({
    where: { email: "membro.suspenso@dev.hubdigital.local" },
    update: { status: "ACTIVE" },
    create: {
      email: "membro.suspenso@dev.hubdigital.local",
      name: "Membro Suspenso Demo",
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  await prisma.onboardingProfile.upsert({
    where: { userId: suspendedUser.id },
    update: {},
    create: {
      userId: suspendedUser.id,
      status: "COMPLETED",
      selectedStage: "HAVE_STARTUP_OR_COMPANY",
      completedAt: new Date(),
    },
  });
  const suspendedMembership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: suspendedUser.id,
        organizationId: orgBySlug["startup-aurora"],
      },
    },
    update: { status: "SUSPENDED" },
    create: {
      userId: suspendedUser.id,
      organizationId: orgBySlug["startup-aurora"],
      status: "SUSPENDED",
    },
  });
  await prisma.membershipRole.upsert({
    where: {
      membershipId_roleId: {
        membershipId: suspendedMembership.id,
        roleId: equipeRoleRow.id,
      },
    },
    update: {},
    create: { membershipId: suspendedMembership.id, roleId: equipeRoleRow.id },
  });

  // Convites em cada estado do ciclo de vida — token de desenvolvimento
  // conhecido apenas localmente (nunca usar em produção).
  async function upsertInvitation(input: {
    organizationId: string;
    email: string;
    roleId: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED" | "EXPIRED";
    devToken: string;
    invitedById: string;
    expiresAt: Date;
    acceptedById?: string;
  }) {
    const tokenHash = createHash("sha256").update(input.devToken).digest("hex");
    await prisma.organizationInvitation.upsert({
      where: { tokenHash },
      update: {
        status: input.status,
        expiresAt: input.expiresAt,
        acceptedById: input.acceptedById ?? null,
      },
      create: {
        organizationId: input.organizationId,
        email: input.email,
        roleId: input.roleId,
        tokenHash,
        invitedById: input.invitedById,
        status: input.status,
        expiresAt: input.expiresAt,
        acceptedById: input.acceptedById,
      },
    });
  }

  const inWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

  await upsertInvitation({
    organizationId: orgBySlug["startup-aurora"],
    email: "convite.pendente@dev.hubdigital.local",
    roleId: equipeRoleRow.id,
    status: "PENDING",
    devToken: "dev-token-pending-0000000000000000000000",
    invitedById: admStartup.id,
    expiresAt: inWeek,
  });
  await upsertInvitation({
    organizationId: orgBySlug["startup-aurora"],
    email: "convite.expirado@dev.hubdigital.local",
    roleId: equipeRoleRow.id,
    status: "EXPIRED",
    devToken: "dev-token-expired-0000000000000000000000",
    invitedById: admStartup.id,
    expiresAt: lastWeek,
  });
  await upsertInvitation({
    organizationId: orgBySlug["startup-aurora"],
    email: "equipestartup@dev.hubdigital.local",
    roleId: equipeRoleRow.id,
    status: "ACCEPTED",
    devToken: "dev-token-accepted-0000000000000000000000",
    invitedById: admStartup.id,
    expiresAt: yesterday,
    acceptedById: equipeStartup.id,
  });
  await upsertInvitation({
    organizationId: orgBySlug["startup-aurora"],
    email: "convite.revogado@dev.hubdigital.local",
    roleId: equipeRoleRow.id,
    status: "REVOKED",
    devToken: "dev-token-revoked-0000000000000000000000",
    invitedById: admStartup.id,
    expiresAt: inWeek,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admHub.id,
      organizationId: orgBySlug["hub-digital"],
      action: "seed.executed",
      entityType: "system",
      metadata: { note: "Seed de desenvolvimento executado" },
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
