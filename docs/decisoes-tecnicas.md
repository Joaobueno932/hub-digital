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

1. **Organização ativa**: persistida em cookie `hub.active-org` (httpOnly, SameSite=Lax, Secure em produção) contendo apenas o ID _preferido_. O cookie nunca autoriza nada: a cada request o valor é revalidado contra os vínculos ativos do usuário (`resolveActiveMembership`); se inválido, aplica-se fallback para o primeiro vínculo válido. A troca só ocorre via server action que valida o vínculo, grava auditoria (`organization.switched`), invalida o cache do layout e redireciona para `/app`. localStorage não é usado.
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

## Decisões da Etapa 1.7 — Solicitações institucionais (2026-07-22)

1. **Conta do solicitante**: envio institucional (startup/espaço) **exige autenticação**; `requesterId` = usuário da sessão. Justificativa: a aprovação só cria vínculo (`membership`) quando há `requesterId`; permitir envio anônimo impediria a concessão de acesso na aprovação. `userId`/`type` do formulário são ignorados — o tipo vem da rota/action.
2. **Schemas**: `organizationPayloadSchema` (fonte de verdade da aprovação) ganhou campos novos **opcionais** (`city/state/website/stage/institution/source/schemaVersion/aceites`) para não quebrar payloads legados/seed nem a aprovação. Os formulários usam `schemas/submission.ts` (estrito) que produz um payload compatível. Sem duplicação de vocabulário.
3. **Duplicidade/concorrência**: bloqueia nova solicitação do mesmo tipo por usuário (PENDING/APPROVED/REJECTED), sem reabertura silenciosa. Garantia por **advisory lock transacional** (`pg_advisory_xact_lock(hashtext(user:type))`) em vez de índice único parcial — escolhido para **não conflitar com o dataset de seed/testes** existente (que tem múltiplos PENDING por usuário em cenários legados). Índice parcial fica como endurecimento futuro.
4. **Sem migration**: payload é JSONB (recebe os campos novos); `submittedAt` = `createdAt`; `source`/`schemaVersion` no payload. Nada novo no schema.
5. **Rate limiting**: por usuário (5/min) e por IP anonimizado (10/min) — `checkRateLimit` em memória (dev). IP tem último octeto zerado e é apenas hasheado como chave efêmera; **IP bruto nunca é persistido**.
6. **Anti-abuso**: honeypot (campo `companyWebsite` oculto/acessível que deve ficar vazio — validado client+server), normalização de whitespace, limites de tamanho, rejeição de URL inválida. **Min-time não implementado** (conflitaria com E2E rápido) — registrado como possível endurecimento.
7. **Privacidade**: páginas `/termos` e `/politica-privacidade` provisórias (claramente marcadas como conteúdo a validar). Persistimos apenas `acceptedTermsVersion`/`acceptedPrivacyVersion`/`acceptedAt` no payload — nunca o texto integral.
8. **Notificação administrativa**: ao submeter, notifica membros ativos de organização HUB com papel ADM_HUB/SUPER_ADMIN (poucos destinatários). Sem e-mail real.
9. **Auditoria**: `registration_request.submitted/submission_conflict/rate_limited/invalid_payload` com metadados seguros (tipo, status, source, schemaVersion, existingStatus) — sem payload completo, telefone, termos ou IP.

## Decisões da Etapa 1.8 — Organizações, membros e convites (2026-07-22)

1. **Modelo de convite**: nova tabela `OrganizationInvitation` em vez de reaproveitar `Membership.status = INVITED` (existente no enum, mas sem uso até aqui). Motivo: um convidado sem conta prévia ainda não tem `User.id` para satisfazer a FK obrigatória de `Membership`. Duas migrations novas: `organization_invitations` (tabela/enum) e `organization_profile_fields` (adiciona `displayName/website/city/state` a `Organization`, campos exigidos pela tela de edição e ainda inexistentes no modelo — CNPJ, endereço completo, faturamento e valuation continuam **não** implementados).
2. **Token**: gerado com `crypto.randomBytes(32)` (base64url), armazenado apenas como hash **sha256** (`tokenHash`, único). sha256 (rápido) é suficiente porque o segredo já tem 256 bits de entropia — diferente de senha, não precisa de hash lento como bcrypt para resistir a força bruta. O token em texto puro só existe no retorno em memória do serviço de criação; nunca é persistido, logado em produção ou gravado em `AuditLog`.
3. **Duplicidade de convite pendente**: mesma técnica de advisory lock transacional (`pg_advisory_xact_lock`) já usada em `submit-registration.ts` (Etapa 1.7), em vez de índice único parcial — consistente com a decisão anterior de não arriscar conflito com dados de seed/teste.
4. **Validade do convite**: 7 dias (`INVITATION_EXPIRATION_DAYS`, `src/modules/invitations/config.ts`), decisão inicial ajustável. **Sem job agendado nesta etapa**: a expiração é aplicada sob demanda — ao carregar `/convites/[token]` ou listar convites da organização, qualquer `PENDING` com `expiresAt` no passado é marcado `EXPIRED` antes da leitura (`listOrganizationInvitations`, `getInvitationByToken`).
5. **Matriz papel-por-tipo-de-organização**: nova em código, `src/modules/memberships/config/role-matrix.ts` (`ALLOWED_ROLES_BY_ORG_TYPE`), pois não havia validação alguma antes (era possível, no código, atribuir qualquer papel a qualquer organização). `EMPRESA/MANTENEDOR/PARCEIRO` ficam sem papéis definidos — convites/trocas de papel para esses tipos são bloqueados até a definição (registrado em `docs/pendencias-negocio.md`). `SUPER_ADMIN` nunca é atribuível por não-SUPER_ADMIN, em nenhum fluxo.
6. **Autoridade de papel**: a posição de cada papel no array de `ALLOWED_ROLES_BY_ORG_TYPE` (índice 0 = maior autoridade) define quem pode conceder o quê — o ator só concede papéis na sua posição ou abaixo, nunca acima. Implementado em `roleAuthorityRank`/`bestAuthorityRank`; a primeira versão exigia posse **exata** do papel-alvo, o que impedia um ADM_STARTUP de rebaixar outro admin — corrigido para comparação por autoridade antes de mergear na integração.
7. **Permissão nova**: `invitations.manage` (módulo `memberships`), atribuída a `ADM_ESPACO_INOVACAO`/`ADM_STARTUP` junto com `members.manage`; `SUPER_ADMIN`/`ADM_HUB` já a recebem via `ALL`. Suspensão/reativação de organização reaproveita `organizations.update` (sem permissão nova) — hoje só `SUPER_ADMIN`/`ADM_HUB` a possuem, o que já implementa "somente escopo global suspende".
8. **Autorização em organização arbitrária**: `requirePermission`/`hasPermission` (`src/lib/authz.ts`) só verificavam a organização **ativa** do cookie. Adicionado `requirePermissionForOrganization(code, organizationId)`, usado pelas rotas `/app/admin/organizacoes/[id]` e `[id]/membros`, que reaproveita a camada de dados (`hasPermission` de `src/modules/permissions/services/authorization.ts`, que já aceita `organizationId` explícito) em vez de reimplementar a lógica de escopo.
9. **Envio de convite em organização não-ativa**: a action `createInvitationAction` originalmente só usava `ctx.activeMembership.organizationId` — quebraria o convite feito a partir da tela administrativa de outra organização (`/app/admin/organizacoes/[id]/membros`). Corrigido para receber `organizationId` explícito no formulário, validado via `requirePermissionForOrganization` (não apenas confiado do client).
10. **E-mail real**: não implementado nesta etapa (documento de decisões da Etapa 1.5 já registrava isso como pendência). Interface `InvitationEmailSender` preparada para substituição futura; `ConsoleInvitationEmailSender` apenas loga em desenvolvimento. O link de convite é exposto na resposta da própria Server Action (`devInviteUrl`), restrito por `invitations.manage` — não é gravado em `AuditLog`/`Notification`, e a UI marca claramente que é um recurso de desenvolvimento.
11. **Concorrência/idempotência**: todos os serviços de mutação (organização, vínculo, convite) seguem o mesmo padrão de `approveRegistrationRequest` (Etapa 1.5): `updateMany` condicionado ao estado esperado dentro de `prisma.$transaction`, com auditoria de conflito (`*.processing_conflict`) quando a corrida é perdida. Edição de organização usa OCC via `updatedAt` (equivalente ao `status: PENDING` do fluxo de registro).
12. **Último administrador**: `assertNotLastActiveAdmin` (guarda de domínio, não de interface) bloqueia rebaixar/suspender/remover o único vínculo ativo com o papel administrador do tipo de organização — inclusive quando o próprio ator tenta agir sobre si mesmo.

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
