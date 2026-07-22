# Modelo de dados inicial — Hub Digital (Fase 1)

Convenções gerais:

- PK `id` UUID; `createdAt`, `updatedAt`; `createdById` (UUID de `User`, nulo para autocadastro/sistema); `deletedAt` (exclusão lógica, quando aplicável).
- Registros que **não podem ser apagados fisicamente**: `AuditLog`, `RegistrationRequest` (histórico de decisões), memberships encerrados, futuras entidades financeiras/reservas/documentos/contratos.
- Isolamento por organização: toda entidade escopada carrega `organizationId` e as queries filtram pelo vínculo validado do usuário.
- O diagrama legado do PDF (pgs. 61–66: `Usuario/Login/PerfilUsuario`, pagamentos por módulo etc.) **não** é replicado — conflita com RBAC multiempresa e Auth.js. Decisão técnica registrada.

## Autenticação (compatível com Auth.js + Prisma Adapter)

### User

`id`, `name`, `email` (unique, citext/lowercase), `emailVerified`, `passwordHash` (nulo para futuros usuários SSO), `image`, `status` (`PENDING | ACTIVE | SUSPENDED | DEACTIVATED`), `createdAt`, `updatedAt`, `deletedAt`.
Sem campo `role` — papéis vêm de memberships.
Índices: unique(email), index(status).

### Account / Session / VerificationToken

Formato padrão do Auth.js. `VerificationToken` também usado para verificação de e-mail e reset de senha (com `type` implícito no identifier ou tabela própria `PasswordResetToken` — ver decisão na implementação).

## Organizações

### OrganizationType

`id`, `code` (unique: HUB, ESPACO_INOVACAO, STARTUP, EMPRESA, MANTENEDOR, PARCEIRO), `name`.

### Organization

`id`, `name`, `displayName` (Etapa 1.8, opcional), `slug` (unique), `typeId → OrganizationType`, `description`, `website`/`city`/`state` (Etapa 1.8, opcionais), `status` (`PENDING | ACTIVE | SUSPENDED | ARCHIVED`), `createdById`, timestamps, `deletedAt`.
Índices: unique(slug), index(typeId, status).
Campos institucionais definitivos (CNPJ, endereço completo, faturamento, valuation) **não** existem — ver `docs/pendencias-negocio.md`.

## Vínculos e RBAC

### Membership

`id`, `userId → User`, `organizationId → Organization`, `status` (`ACTIVE | INVITED | SUSPENDED | ENDED`), `createdById`, timestamps, `deletedAt`.
Unique(userId, organizationId). Encerramento é lógico (histórico).
`INVITED` permanece definido no enum mas não é usado pelo fluxo de convite (Etapa 1.8) — convites de usuários sem conta prévia usam a tabela `OrganizationInvitation` (abaixo), já que não há `User.id` para satisfazer a FK de `Membership` antes da aceitação.

### Role

`id`, `code` (unique: SUPER_ADMIN, ADM_HUB, ADM_ESPACO_INOVACAO, USUARIO_ESPACO_INOVACAO, ADM_STARTUP, USUARIO_EQUIPE_STARTUP, USUARIO_COMUM), `name`, `description`, `isSystem` (papéis do sistema não deletáveis).

### Permission

`id`, `code` (unique, formato `dominio.acao`, ex.: `users.list`, `registrations.approve`), `description`, `module`.

### RolePermission

`roleId`, `permissionId` — PK composta.

### MembershipRole

`membershipId`, `roleId`, `assignedById`, `createdAt` — unique(membershipId, roleId).

### OrganizationInvitation (Etapa 1.8)

`id`, `organizationId → Organization`, `email` (normalizado: trim + lowercase), `roleId → Role`, `status` (`PENDING | ACCEPTED | DECLINED | REVOKED | EXPIRED`), `tokenHash` (unique, sha256 do token — o token em texto puro nunca é persistido), `invitedById → User`, `acceptedById → User` (nulo até aceito), `expiresAt`, `acceptedAt`, `declinedAt`, `revokedAt`, timestamps.
Índices: unique(tokenHash), index(organizationId, status), index(email, status).
Validade padrão: 7 dias (`INVITATION_EXPIRATION_DAYS`, ajustável). Sem job agendado: um convite `PENDING` com `expiresAt` vencido é marcado `EXPIRED` sob demanda, na leitura (`GET /convites/[token]` ou listagem administrativa). Nunca apagado fisicamente. Duplicidade de convite `PENDING` por (organização, e-mail) é garantida em runtime por advisory lock transacional, mesma técnica do `RegistrationRequest` (Etapa 1.7) — não por índice único parcial, para não conflitar com o dataset de seed.

## Solicitações de cadastro

### RegistrationRequest

`id`, `type` (`USER | STARTUP | ESPACO_INOVACAO`), `requesterId → User` (nulo se anterior à criação da conta), `payload` (JSONB validado por schemas Zod por tipo — ver `src/modules/registrations/schemas/payloads.ts`), `status` (`PENDING | APPROVED | REJECTED`; `RESUBMITTED` reservado para o futuro fluxo de correção), `decidedById`, `decidedAt`, `decisionReason` (obrigatório na reprovação), `resultingOrganizationId`, `resultingMembershipId` (preenchidos na aprovação), `previousRequestId` (encadeia reenvios futuros), timestamps.
Transições permitidas: apenas `PENDING → APPROVED` e `PENDING → REJECTED`, garantidas por OCC (`updateMany` condicionado ao status dentro de transação).

**Etapa 1.7 (solicitações institucionais públicas):** o `payload` JSONB passou a conter, além de `organizationName/contactName/contactEmail/contactPhone/description`, os campos opcionais `city`, `state`, `website`, `stage` (startup), `institution` (espaço), `source`, `schemaVersion`, `acceptedTermsVersion`, `acceptedPrivacyVersion`, `acceptedAt`. Todos **opcionais** em `organizationPayloadSchema` — payloads legados continuam válidos e a aprovação é inalterada. **Sem migration** (campos vivem no JSONB). Duplicidade de solicitação PENDING por (usuário, tipo) é garantida em runtime por advisory lock transacional (não por índice), para não conflitar com o dataset de seed.
Nunca apagada fisicamente. Índices: index(status, type), index(requesterId).

## Onboarding

### OnboardingProfile

`id`, `userId` (unique), `status` (`DRAFT | COMPLETED`; `NOT_STARTED` = ausência de registro), `selectedStage` (`WANT_TO_START | HAVE_IDEA | HAVE_IDEA_AND_TEAM | HAVE_TEAM_AND_SOLUTION | HAVE_STARTUP_OR_COMPANY`, nulo em rascunho recém-criado), `version` (Int, controle otimista de concorrência), `startedAt`, `completedAt`, `createdAt`, `updatedAt`.
Índice único por `userId` (um onboarding por usuário). Transições: inexistente→DRAFT→COMPLETED. Sem cálculo de maturidade, sem pontuação; `answers`/`questionnaireVersion` removidos (fora do escopo confirmado); `currentStep` não modelado (fluxo trivial). Carregado/alterado sempre pelo `userId` da sessão — nunca por id vindo do cliente. Migration `20260722060000_onboarding_stage_selection`.

## Planos (estrutura mínima, sem venda)

### Plan

`id`, `name`, `slug` (unique), `description`, `priceCents` (nulo = sob consulta), `billingPeriod` (`MONTHLY | YEARLY | ONE_TIME | UNDEFINED`), `scope` (`GENERAL | COWORKING | PROJECTS`), `active`, timestamps, `deletedAt`.

### Subscription (futura — criada apenas como contrato de tipo, sem tabela na Fase 1, para evitar tabela vazia; documentada aqui para a Fase 2/5)

`id`, `organizationId`/`userId`, `planId`, `status`, `startsAt`, `endsAt`, `canceledAt`. Não deletável fisicamente.

## Módulos e flags

### Module

`id`, `code` (unique: portal, coworking, events, ideation, projects, trends, academy), `name`, `order`.

### FeatureFlag

`id`, `key` (unique por escopo), `enabled`, `organizationId` (nulo = global; override por organização), `description`, timestamps.
Unique(key, organizationId).

## Notificações

### Notification

`id`, `userId`, `type`, `title`, `body`, `link`, `readAt`, `createdAt`.
Índice: index(userId, readAt).

## Auditoria

### AuditLog

`id`, `actorId` (nulo = sistema), `organizationId` (nulo = global), `action` (ex.: `registration.approved`), `entityType`, `entityId`, `metadata` (JSONB), `ip`, `userAgent`, `createdAt`.
Somente inserção; sem update/delete; sem `deletedAt`.
Índices: index(entityType, entityId), index(actorId), index(createdAt).

## Arquivos

### FileAsset

`id`, `storageKey` (unique, nome gerado seguro), `originalName`, `mimeType`, `sizeBytes`, `visibility` (`PUBLIC | PRIVATE`), `ownerId`, `organizationId` (nulo = pessoal), `createdAt`, `deletedAt`.

## Relacionamentos-chave

- User 1—N Membership N—1 Organization; Membership N—N Role (via MembershipRole); Role N—N Permission.
- RegistrationRequest N—1 User (requester) e N—1 Organization (resultante).
- FeatureFlag N—1 Organization (override).
- OrganizationInvitation N—1 Organization, N—1 Role, N—1 User (invitedBy), N—1 User opcional (acceptedBy).

## Domínios futuros

Coworking, Eventos, Ideação, Projetos e Tendências **não** ganham tabelas na Fase 1. Suas entidades legadas do PDF (Sala, Agendamento, Evento, Campanha, Etapa, Relatorio, Equipe, PlanoGestaoProjetos etc.) serão remodeladas nas fases 2–5 sobre esta fundação (organizações, RBAC, auditoria, arquivos).
