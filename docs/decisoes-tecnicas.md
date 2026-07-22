# Decisões técnicas — Hub Digital

Este documento registra decisões técnicas confirmadas ou propostas para o desenvolvimento do Hub Digital.

## Decisões adicionadas na auditoria de 2026-07-21

1. O modelo de dados legado do PDF (páginas 61–66: `Usuario/Login/PerfilUsuario`, pagamentos por módulo) não será replicado; usa-se o modelo RBAC multiempresa de `docs/modelo-dados.md`.
2. "Adm Incubado" do documento é mapeado para o papel `ADM_STARTUP`; "Usuário Equipe Incubado" para `USUARIO_EQUIPE_STARTUP`.
3. `SUPER_ADMIN` é criação técnica (não existe no documento de 2022), com todas as permissões.
4. Exclusões com necessidade de histórico são lógicas (`deletedAt`); `AuditLog` e `RegistrationRequest` nunca são apagados fisicamente.
5. Solicitações de startup/espaço criam a organização somente após aprovação; payload em JSONB para absorver campos ainda não confirmados.
6. Tipografia do MVP: Lexend (Google Fonts), até confirmação de licenciamento de Nexa/Gotham.
7. Feature flags avaliadas no servidor, com override por organização.
8. Rate limiting via interface com implementação em memória no MVP.

## Decisões da Etapa 1.4 (2026-07-21)

1. **Organização ativa**: persistida em cookie `hub.active-org` (httpOnly, SameSite=Lax, Secure em produção) contendo apenas o ID *preferido*. O cookie nunca autoriza nada: a cada request o valor é revalidado contra os vínculos ativos do usuário (`resolveActiveMembership`); se inválido, aplica-se fallback para o primeiro vínculo válido. A troca só ocorre via server action que valida o vínculo, grava auditoria (`organization.switched`), invalida o cache do layout e redireciona para `/app`. localStorage não é usado.
2. **Escopo global**: SUPER_ADMIN (qualquer vínculo ativo) tem todas as permissões; papéis de vínculos em organização do tipo HUB (ex.: ADM_HUB) têm escopo global para as permissões que possuem. Regra centralizada em `src/modules/permissions/services/authorization.ts` e coberta por testes de integração.
3. **Duas camadas de autorização**: camada de dados (`authorization.ts`, por userId/orgId, testável) e wrappers de sessão (`src/lib/authz.ts`: `requireSessionContext`, `requirePermission`, `requireAnyPermission`, `requireActiveOrganization`), com cache por request (`React.cache`).
4. **Menu**: configuração declarativa em `src/config/navigation.ts`; filtro server-side por permissão, feature flag, tipo de organização e vínculo. Ocultar item não substitui a autorização da rota — toda página chama `requirePermission`/`requireSessionContext`.
5. **Testes de integração** rodam contra o PostgreSQL do Docker (dados do seed + fixtures temporárias com limpeza no próprio teste).
6. Flags adicionais criadas para itens futuros do portal: `agenda`, `connections`, `mentoring`, `evolution` (desabilitadas).

## Decisões da Etapa 1.5 (2026-07-21)

1. **Máquina de estados de RegistrationRequest**: apenas `PENDING → APPROVED` e `PENDING → REJECTED`. Correção/reenvio (`NEEDS_CORRECTION`/`RESUBMITTED`) não está confirmado pelo negócio; o valor `RESUBMITTED` do enum e o campo `previousRequestId` ficam reservados para essa evolução. `APPROVED`/`REJECTED` são finais — não há reabertura sem regra explícita. `CANCELLED` não foi criado (sem justificativa de negócio).
2. **Concorrência/idempotência**: dentro de transação Prisma, `updateMany` condicionado a `status: PENDING` "reivindica" a solicitação (OCC). O perdedor da corrida recebe `RegistrationConflictError`, registra `registration_request.processing_conflict` e nada duplica (organização, vínculo, notificação, auditoria). Não dependemos do frontend.
3. **Autoaprovação**: bloqueada no servidor para qualquer ator (inclusive SUPER_ADMIN solicitante — mantido bloqueado nesta fase); tentativa gera `registration_request.self_review_blocked`.
4. **Permissões**: reutilizadas as granulares já existentes `registrations.list/view/approve/reject` — mesma granularidade pedida pela especificação (read/review/approve/reject), sem duplicar códigos.
5. **Aprovação de USER sem conta prévia**: a decisão é registrada, mas a criação de credenciais ficará no futuro fluxo de convite (pendência registrada).
6. **Campo novo**: `resultingMembershipId` em RegistrationRequest (migration `registration_result_membership`). `reviewedAt/reviewedBy` já existiam como `decidedAt/decidedById`.
7. **E2E**: Playwright com banco PostgreSQL dedicado `hub_digital_e2e` (mesmo container), resetado com `prisma migrate reset` + seed no global-setup; servidor `next start` na porta 3100 com `DATABASE_URL` própria. Nunca roda contra o banco de desenvolvimento.
8. **`registration_request.viewed` não é auditado**: visualização não é considerada sensível no padrão atual (evita ruído no log); decisões e tentativas bloqueadas são.

## Decisões da Etapa 1.6 — Onboarding (2026-07-21)

1. **Estados**: `NOT_STARTED` (ausência de registro), `DRAFT`, `COMPLETED`. Transições: inexistente→DRAFT, DRAFT→DRAFT, DRAFT→COMPLETED. Sem SKIPPED/CANCELLED/REJECTED. Após COMPLETED não há sobrescrita silenciosa nem re-finalização (a possibilidade de **alterar o estágio após a conclusão** fica como pendência de negócio).
2. **Enum** `OnboardingStage` renomeado para nomes semânticos em inglês (WANT_TO_START, HAVE_IDEA, HAVE_IDEA_AND_TEAM, HAVE_TEAM_AND_SOLUTION, HAVE_STARTUP_OR_COMPANY); textos ao usuário em português, centralizados em `src/modules/onboarding/config/stages.ts` (valor, título, descrição, ordem, ícone). `OnboardingStatus.IN_PROGRESS` renomeado para `DRAFT`.
3. **Modelo**: removidos `answers` e `questionnaireVersion` (sem uso no escopo confirmado); `stage`→`selectedStage`; adicionado `version` (OCC). **`currentStep` foi intencionalmente omitido** — o fluxo (seleção→revisão) é trivial e a revisão está a um clique, então não há uso real que justifique o campo. Migration `20260722060000_onboarding_stage_selection` (tabela vazia → substituição de enums e remoção de colunas segura).
4. **Concorrência/idempotência**: mesmo padrão OCC das etapas anteriores — `updateMany` condicionado ao status dentro de transação. Segunda finalização não duplica notificação/auditoria nem altera `completedAt`/estágio; conclusões concorrentes: só uma processa. Criação concorrente do rascunho é resolvida pela unicidade de `userId` (P2002 → atualização).
5. **Independência de organização**: o onboarding é sempre do `userId` da sessão; nunca usa `organizationId` do cliente; usuário sem vínculo conclui normalmente e o fluxo não cria/altera organização nem vínculo.
6. **Autoaproveitamento indevido/IDOR**: não há administração de onboarding nesta etapa; o fluxo pessoal ignora qualquer `userId`/`onboardingId` do formulário.
7. **Redirecionamento pós-login** centralizado em `resolvePostLoginRedirect` (serviço) + action `resolvePostLoginRedirectAction`: sem onboarding/DRAFT → `/app/onboarding`; COMPLETED → `/app`. `callbackUrl` (rota protegida) tem precedência. Usuários do seed usados em E2E ficam COMPLETED para não alterar os testes existentes.
8. **Formulários**: usados Server Actions + `useActionState` + form nativo (consistente com login/cadastro/decisão), sem React Hook Form — o onboarding é um único radiogroup, e RHF não agregaria valor. Registrado por transparência (CLAUDE.md lista RHF como stack preferencial; adotado onde houver formulários complexos).
9. **ESLint**: adicionado `argsIgnorePattern/varsIgnorePattern: "^_"` (convenção idiomática para parâmetros intencionalmente não usados, ex.: assinatura `(prevState, formData)` do `useActionState`) e ignore de `src/generated/**`. Não é enfraquecimento de regra.

## Status das decisões

As decisões deste documento são iniciais e deverão ser revisadas após a auditoria completa dos requisitos e protótipos.

## Arquitetura

O sistema será inicialmente desenvolvido como um monólito modular.

Cada domínio funcional deverá possuir seus próprios:

- componentes;
- serviços;
- validações;
- repositórios;
- permissões;
- tipos;
- testes.

Os módulos deverão permanecer desacoplados para permitir uma futura separação em serviços independentes, caso necessário.

## Aplicação web

Stack inicial proposta:

- Next.js com App Router;
- React;
- TypeScript em modo strict;
- Tailwind CSS;
- componentes acessíveis;
- React Hook Form;
- Zod.

## Banco de dados

- PostgreSQL;
- Prisma ORM;
- migrations versionadas;
- UUID como identificador principal;
- exclusão lógica para registros com histórico;
- auditoria para ações administrativas.

## Autenticação

A autenticação inicial será construída com Auth.js.

A arquitetura deverá permitir futura integração com:

- Keycloak;
- SSO institucional;
- Microsoft Entra ID;
- outro provedor corporativo.

## Organizações e permissões

O sistema será multiempresa.

Um usuário poderá possuir diferentes vínculos e permissões em diferentes organizações.

Não deverá existir somente um campo fixo de perfil na tabela de usuários.

O modelo deverá utilizar:

- usuários;
- organizações;
- vínculos;
- papéis;
- permissões;
- associação entre vínculo e papel.

## Interface visual

O Figma será utilizado como referência de:

- identidade visual;
- estrutura das páginas;
- fluxos;
- navegação;
- componentes.

O código não deverá copiar literalmente os posicionamentos absolutos do Figma.

As telas deverão ser:

- responsivas;
- acessíveis;
- reutilizáveis;
- compatíveis com diferentes tamanhos de conteúdo.

## Regras de negócio

O documento de requisitos possui prioridade sobre inferências visuais do Figma.

Quando houver conflito ou ausência de informação, a questão deverá ser registrada em `docs/pendencias-negocio.md`.

## Arquivos

Arquivos públicos deverão ser armazenados em `public`.

Arquivos privados deverão futuramente utilizar armazenamento compatível com S3 e URLs temporárias.

## Integrações

Nenhuma integração deverá ser implementada com endpoints ou credenciais inventadas.

Enquanto não houver acesso real, deverão ser utilizados:

- interfaces;
- adaptadores;
- mocks;
- feature flags.

## Pagamentos

O gateway de pagamento definitivo ainda precisa ser confirmado.

A lógica financeira deverá ficar desacoplada do provedor utilizado.

## Desenvolvimento

Cada etapa deverá obrigatoriamente executar:

- lint;
- testes;
- verificação de tipos;
- build.

Uma funcionalidade não deverá ser considerada concluída enquanto apresentar erros nessas validações.