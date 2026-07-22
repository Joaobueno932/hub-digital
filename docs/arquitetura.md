# Arquitetura — Hub Digital

## Visão geral

Monólito modular full-stack em Next.js (App Router) com PostgreSQL. Um único deploy, com fronteiras de domínio explícitas em `src/modules/*` para permitir extração futura de serviços.

### Por que monólito modular

- Equipe pequena e MVP amplo: um repositório e um pipeline reduzem custo operacional.
- Os módulos compartilham autenticação, organizações, permissões, arquivos, notificações e auditoria — separar serviços agora criaria acoplamento de rede sem benefício.
- O desacoplamento é garantido por convenção (módulos não importam internals de outros módulos; apenas serviços públicos) e por feature flags.

## Camadas

1. **Apresentação** — `src/app/**` (páginas, layouts, route handlers) e `src/components/**`. Sem regra de negócio.
2. **Aplicação** — `actions/` (Server Actions com validação Zod + verificação de sessão/permissão) e `services/` de cada módulo.
3. **Domínio** — `schemas/`, `types/`, `permissions/` de cada módulo; regras puras e testáveis.
4. **Infraestrutura** — `src/lib/` (Prisma client, auth, e-mail, storage, rate limit), adaptadores de integração.

## Estrutura de diretórios

Conforme CLAUDE.md, com um módulo adicional `registrations` (solicitações de cadastro) e `feature-flags`:

```text
src/
├── app/            # (public), (auth), (dashboard), api
├── modules/        # auth, users, organizations, memberships, permissions,
│                   # registrations, onboarding, plans, notifications,
│                   # files, feature-flags, audit
├── components/     # ui, layout, forms, feedback
├── config/         # módulos, navegação, flags padrão
├── lib/            # prisma, auth, email, rate-limit, storage
├── hooks/ styles/ types/
```

Cada módulo: `components/ actions/ services/ repositories/ schemas/ permissions/ types/ tests/` (criados sob demanda).

## Autenticação

- Auth.js (NextAuth v5) com provider Credentials (e-mail/senha) + Prisma Adapter; sessão JWT.
- Hash de senha com argon2id (ou bcrypt, ver `decisoes-tecnicas.md`).
- Verificação de e-mail preparada via `VerificationToken`; envio real de e-mail atrás de interface `MailProvider` (mock em dev).
- Recuperação de senha por token de uso único com expiração.
- Anti-enumeração: respostas idênticas para e-mail existente/não existente; tempos homogêneos.
- Rate limiting: interface `RateLimiter` com implementação em memória no MVP e contrato para Redis futuramente.
- SSO futuro (Keycloak, Entra ID, Google, LinkedIn): Auth.js já suporta múltiplos providers; nenhum é ativado sem credenciais.

## Autorização (RBAC multiempresa)

- Modelo: `User → Membership(Organization) → MembershipRole → Role → RolePermission → Permission`.
- Permissões granulares no formato `dominio.recurso.acao` (ex.: `users.list`, `registrations.approve`).
- Papéis globais (SUPER_ADMIN, ADM_HUB) são memberships na organização Hub.
- Toda Server Action e route handler valida sessão + permissão + escopo da organização ativa **no servidor**. O menu apenas reflete permissões; nunca as substitui.
- Organização ativa armazenada em cookie assinado/sessão; toda query de dados escopados filtra por `organizationId` do vínculo validado (anti-IDOR).

### Implementação (Etapa 1.4)

- **Serviço central**: `src/modules/permissions/services/authorization.ts` (dados) + `src/lib/authz.ts` (sessão). Nenhuma página consulta permissões diretamente no Prisma.
- **Como proteger uma página**: chamar `requirePermission("codigo")` ou `requireAnyPermission([...])` no início do server component; para páginas que exigem organização, `requireActiveOrganization()`. Ausência de sessão → redirect `/login`; sem permissão → redirect `/app/acesso-negado` (sem revelar dados); sem organização → `/app/sem-organizacao`.
- **Escopo global (`/app/admin`)**: telas que mostram dados de **todas** as organizações usam `requireGlobalPermission`/`requireAnyGlobalPermission`, que aceitam apenas SUPER_ADMIN ou permissões de vínculo em organização HUB. `requirePermission` **não** serve aí: ele aceitaria a permissão concedida dentro de qualquer organização, expondo dados de terceiros (ver a correção documentada em `matriz-permissoes.md`). No menu, o item correspondente marca `requiresGlobalScope: true`.
- **Como proteger uma server action**: (1) `requireSessionContext()`; (2) validar organização ativa/vínculo; (3) `requirePermission`; (4) validar entrada com Zod; (5) operar sempre escopado ao `organizationId` do vínculo validado; (6) gravar `AuditLog`. Nunca usar IDs de organização vindos do cliente sem conferir contra `ctx.access.memberships`.
- **Organização ativa**: cookie `hub.active-org` = preferência; validação por request; fallback automático; troca via `switchOrganizationAction` (auditada).
- **Menu**: novo item = entrada em `src/config/navigation.ts` (label, ícone lucide, rota, grupo, `anyPermission`, `featureFlag`, `organizationTypes`, `requiresOrganization`) + proteção server-side na página. Associar flag a módulo = usar a mesma chave da flag no item e em `canAccessModule`.
- **Isolamento multiempresa**: consultas escopadas usam sempre `ctx.activeMembership.organizationId`; testar novos casos seguindo `src/modules/permissions/tests/authorization.int.test.ts` (fixtures temporárias + tentativa de acesso cross-org com ID trocado).

### Solicitações de cadastro (Etapa 1.5)

- Estados: `PENDING → APPROVED | REJECTED` (finais). Reenvio/correção reservado para fase futura.
- Aprovação (`approveRegistrationRequest`): autentica → permissão `registrations.approve` → bloqueio de autoaprovação → validação Zod do payload JSONB → transação com `updateMany` condicionado ao status (OCC) → cria organização/vínculo/papel conforme o tipo → notificação + auditoria → revalidação de rotas. Reprovação (`rejectRegistrationRequest`): justificativa obrigatória (10–1000 chars, trim), mesmo padrão OCC, nada é criado nem apagado.
- Entidades por tipo: USER → ativa o usuário; STARTUP → Organization(STARTUP) + Membership + ADM_STARTUP; ESPACO_INOVACAO → Organization(ESPACO_INOVACAO) + Membership + ADM_ESPACO_INOVACAO. Nenhum plano é associado.
- Payload inválido/legado: aprovação bloqueada com estado seguro na UI; reprovação continua possível.

### Solicitações institucionais públicas (Etapa 1.7)

- Rotas `/cadastro/startup`, `/cadastro/espaco-inovacao`, `/cadastro/enviado` (exigem sessão; `getCurrentUser` → redirect login) e `/app/minhas-solicitacoes` (lista escopada por sessão). Páginas legais `/termos` e `/politica-privacidade` (provisórias).
- Formulários com **React Hook Form + Zod** (`schemas/submission.ts`) validando client e servidor. Submissão via Server Actions (`submitStartupRequestAction`/`submitInnovationSpaceRequestAction`) — o **tipo vem da action**, nunca do cliente.
- Serviço `submit-registration.ts`: rate limit (usuário + IP anonimizado) → validação Zod → honeypot → advisory lock transacional → checagem de duplicidade → cria `RegistrationRequest` PENDING (nunca cria organização/vínculo) → auditoria → notifica admins. Alimenta o fluxo administrativo existente de aprovação/reprovação.
- Payload público é compatível com `organizationPayloadSchema`, então a aprovação segue criando organização + vínculo (ADM_STARTUP/ADM_ESPACO_INOVACAO) sem alterações.

### Testes E2E (Playwright)

- `npm run test:e2e` — exige `docker compose up -d`. O global-setup reseta o banco dedicado `hub_digital_e2e` (`prisma migrate reset` + seed) e faz o build; o `webServer` sobe `next start` na porta 3100 com `DATABASE_URL` própria. Var opcional `E2E_DATABASE_URL` sobrescreve a URL do banco de teste.
- Suítes: autenticação, organização ativa, permissões/menu, decisões de cadastro, solicitações institucionais e gestão de membros/convites (Etapa 1.8). Seletores por role/label/texto.

### Onboarding do usuário (Etapa 1.6)

- **Finalidade**: o usuário classifica seu estágio (uma de cinco opções). Não há cálculo de maturidade, pontuação nem recomendação — o resultado fica persistido para uso futuro.
- **Módulo** `src/modules/onboarding/`: `config/stages.ts` (fonte única dos 5 estágios), `schemas/`, `services/` (get-onboarding-profile, save-onboarding-draft, complete-onboarding, resolve-post-login-redirect, errors), `actions/`, `components/`, `tests/`.
- **Persistência/retomada**: rascunho por `userId` da sessão; ao retomar, o estágio salvo vem pré-selecionado. **Finalização** transacional com OCC (status-guard) — idempotente e segura contra concorrência. **Notificação** interna única na conclusão; **auditoria**: `onboarding.started`, `onboarding.draft_saved`, `onboarding.completed`, `onboarding.completion_conflict`.
- **Redirecionamento pós-login** centralizado: sem onboarding/DRAFT → `/app/onboarding`; COMPLETED → `/app`. `callbackUrl` tem precedência. O dashboard mostra o estado (iniciar/continuar/estágio informado) sem forçar redirect.
- **Rotas** `/app/onboarding`, `/app/onboarding/revisao`, `/app/onboarding/concluido`: exigem sessão (não organização), carregam apenas o próprio perfil e tratam os estados com redirects seguros.

### Organizações, membros e convites (Etapa 1.8)

- **Módulos**: `src/modules/organizations/` (edição, suspensão/reativação), `src/modules/memberships/` (troca de papel, suspensão/reativação/remoção lógica, `config/role-matrix.ts`, `services/guard-last-admin.ts`), `src/modules/invitations/` (ciclo de vida completo do convite: criação, aceitação, recusa, revogação, token/hash, config de validade).
- **Padrão de serviço**: idêntico ao de `registrations` (Etapa 1.5) — service puro + `prisma.$transaction` + OCC via `updateMany` condicionado + `AuditLog`/`Notification` dentro da mesma transação + erros tipados mapeados para mensagens seguras na action.
- **Autorização em organização arbitrária**: `requirePermissionForOrganization` (`src/lib/authz.ts`) estende o padrão de `requirePermission` (que só cobre a organização ativa) para as rotas administrativas sobre organização arbitrária.
- **Rotas**: `/app/minha-organizacao` (edição, escopo `.own`), `/app/membros` e `/app/convites` (organização ativa), `/convites/[token]` (aceitação/recusa, autenticada com callback interno saneado), `/app/admin/organizacoes`, `/app/admin/organizacoes/[organizationId]` e `/app/admin/organizacoes/[organizationId]/membros` (escopo administrativo, qualquer organização).
- **Componentes de confirmação**: `<dialog>` nativo (mesmo padrão de `DecisionPanel` da Etapa 1.5) — nunca `window.confirm`.

## Multiempresa

- Tipos de organização: HUB, ESPACO_INOVACAO, STARTUP, EMPRESA, MANTENEDOR, PARCEIRO (tabela `OrganizationType`).
- Usuário pode ter N vínculos; seletor de organização ativa no layout interno.

## Arquivos

MVP: uploads não são necessários; módulo `files` define a interface `FileStorage` (S3-compatível) com implementação local em dev. Regras: validação de MIME/extensão, limite de tamanho, nomes gerados (UUID), URLs temporárias para privados (futuro).

## Auditoria

`AuditLog` imutável (sem update/delete): ator, organização, ação, entidade, entityId, diff resumido (JSON), IP/user-agent quando disponível. Gravado nos services de ações administrativas e de segurança (login, aprovação, alteração de papéis, flags).

## Notificações

`Notification` interna (in-app) no MVP: destinatário, tipo, título, corpo, lida em. Interface `Notifier` para futura extensão (e-mail, push).

## Feature flags

Tabela `FeatureFlag` (chave, habilitada, escopo opcional por organização) + defaults em `src/config/feature-flags.ts`. Avaliação **no servidor** (`isFeatureEnabled(key, orgId?)`); flags previstas: coworking, events, ideation, projects, trends, reports, academy, payments, external-integrations.

## Integrações

Interfaces por integração (`EventTicketProvider`, `PaymentGateway`, `MailProvider`, `FileStorage`, `LmsProvider`, `BiSource`), com mocks locais. Nenhum endpoint/chave inventado.

## Testes

- Vitest + Testing Library: serviços (autorização, aprovação, onboarding), schemas Zod, componentes críticos.
- Playwright: fluxos de login, cadastro, aprovação, onboarding (fase posterior do MVP).
- Testes de autorização são obrigatórios para toda action administrativa.

## Implantação

- Dev: Docker Compose (PostgreSQL) + `next dev`.
- Produção (proposta, não confirmada): container Node atrás de proxy; migrations via `prisma migrate deploy`; variáveis por ambiente; sem secrets no repositório.

## SSO corporativo futuro

Manter toda criação de usuário passando por `users/services` (não direto no adapter) para que contas provisionadas por SSO/Keycloak entrem no mesmo funil de vínculos e permissões.
