# Hub Digital

Plataforma modular do ecossistema de inovação: portal, cadastro com aprovação, organizações multiempresa, permissões granulares (RBAC), onboarding, e módulos futuros de Coworking, Eventos, Ideação, Gestão de Projetos, Tendências e Negócios e Academy.

Documentação de referência em [docs/](docs/): análise funcional, arquitetura, modelo de dados, matriz de permissões, design system, plano de implementação e pendências de negócio.

## Estado atual (Fase 1 — em andamento)

Implementado e validado:

- Projeto Next.js 16 (App Router, TypeScript strict, Tailwind CSS 4) com tokens da identidade visual.
- PostgreSQL via Docker Compose; Prisma 7 com migration inicial versionada e seed reproduzível.
- Autenticação com Auth.js v5 (e-mail/senha, sessão JWT, proteção contra enumeração, rate limiting em memória).
- Cadastro de usuário comum (Server Action + Zod), login, logout, proteção de `/app` (proxy + verificação de sessão no servidor).
- Landing page, telas de login/cadastro/recuperação (recuperação em preparação) e dashboard inicial.
- **Etapa 1.4 concluída:** serviço central de autorização (RBAC multiempresa com escopo global para SUPER_ADMIN/ADM_HUB), organização ativa persistida em cookie httpOnly revalidado no servidor, seletor de organização, menu interno filtrado por permissão/flag/tipo de organização, menu mobile, páginas administrativas mínimas protegidas (usuários, organizações, cadastros, perfis, permissões, auditoria), estados de acesso negado/sem organização/loading.
- Testes: unitários + integração de autorização e IDOR contra o PostgreSQL do Docker (26 testes).
- **Etapa 1.5 concluída:** gestão de solicitações de cadastro em `/app/admin/cadastros` — listagem com resumo por status, busca, filtros, paginação server-side; página de detalhes com payload validado por Zod (payload legado cai em estado seguro); aprovação transacional que cria organização + vínculo + papel (ADM_STARTUP/ADM_ESPACO_INOVACAO) ou ativa o usuário; reprovação com justificativa obrigatória; idempotência e proteção contra concorrência (OCC por status); bloqueio de autoaprovação; notificações internas e auditoria completas.
- **Playwright configurado** com banco E2E dedicado (`hub_digital_e2e`): suítes de autenticação, organização ativa, permissões, decisões de cadastro e onboarding.
- **Etapa 1.6 concluída:** onboarding persistente do usuário (classificação em 5 estágios) com rascunho, retomada, revisão e conclusão idempotente; estados NOT_STARTED/DRAFT/COMPLETED; redirecionamento pós-login centralizado (`/app/entrada`); card de estado no dashboard; auditoria e notificação. Sem cálculo de maturidade nem recomendações (fora de escopo).
- **Etapa 1.7 concluída:** formulários públicos de solicitação de Startup (`/cadastro/startup`) e Espaço de Inovação (`/cadastro/espaco-inovacao`) com React Hook Form + Zod, exigindo autenticação; serviço de submissão com rate limiting (usuário + IP anonimizado), honeypot, advisory lock transacional (duplicidade/concorrência), auditoria e notificação de administradores; página de sucesso (`/cadastro/enviado`); "Minhas solicitações" (`/app/minhas-solicitacoes`); páginas legais provisórias (`/termos`, `/politica-privacidade`). Alimenta o fluxo de aprovação existente (payload compartilhado), sem criar organização antes da aprovação.
- **Etapa 1.8 concluída:** edição de organização (`/app/minha-organizacao`, `/app/admin/organizacoes/[id]`) com OCC; suspensão/reativação de organização; administração global de organizações com busca/filtro/paginação/ordenação (`/app/admin/organizacoes`); gestão completa de membros (`/app/membros`, `/app/admin/organizacoes/[id]/membros`) — troca de papel respeitando a matriz papel-por-tipo-de-organização, suspensão/reativação/remoção lógica, proteção do último administrador; convites (`/app/convites`, `/convites/[token]`) com token hasheado, aceitação/recusa/revogação/expiração preguiçosa, e-mail real ainda não implementado (link exposto na própria tela, restrito por permissão). Proteção contra IDOR em todas as rotas/actions/services; auditoria e notificações em todas as mutações.

- **Etapa 1.9 concluída:** administração de usuários da plataforma (`/app/admin/usuarios` com busca, filtros por status/papel/organização, ordenação e paginação; `/app/admin/usuarios/[userId]` com vínculos, papéis, onboarding, solicitações, notificações e auditoria) e suspensão/reativação de contas com motivo, responsável, auditoria e notificação — protegidas contra auto-suspensão, contra ADM_HUB administrar SUPER_ADMIN e contra deixar a plataforma sem nenhum SUPER_ADMIN ativo; gerenciamento visual de feature flags (`/app/admin/feature-flags`) com catálogo central em código, valor global, override por organização, valor efetivo e origem; `requireFeature` bloqueando o acesso direto às rotas de módulo desabilitado. Também corrigiu um vazamento cross-tenant: `/app/admin` passou a exigir escopo global.

Ainda não implementado (ver [docs/plano-implementacao.md](docs/plano-implementacao.md), que traz a revisão completa do estado da Fase 1): verificação de e-mail/reset de senha com envio real, reenvio de convite, alteração administrativa de e-mail, "último acesso" (não há dado confiável no modelo), papéis para organizações do tipo EMPRESA/MANTENEDOR/PARCEIRO e as funcionalidades dos módulos das fases 2–6.

### Administração de usuários e feature flags (Etapa 1.9)

`/app/admin` inteiro exige **escopo global** (SUPER_ADMIN ou vínculo em organização HUB) — administrar as pessoas da própria organização continua em `/app/membros`. Contas suspensas não conseguem autenticar e perdem o acesso da sessão ativa no request seguinte (a sessão é JWT e é revalidada contra o banco a cada request). E-mail, senha, papéis e organizações **não** são editáveis pela tela de usuários.

As feature flags têm catálogo em `src/config/feature-flags.ts` (nome, módulo e sensibilidade) e estado no banco: `organizationId` nulo é o valor global e preenchido é o override daquela organização, que prevalece. Uma flag desabilitada some do menu **e** bloqueia a rota — inclusive para SUPER_ADMIN. `payments` e `external-integrations` só o SUPER_ADMIN altera. Cenários no seed: `superadmin2@dev.hubdigital.local` (segundo super administrador), `conta.suspensa@dev.hubdigital.local` (conta suspensa, permanece suspensa após reexecutar o seed), `agenda` global habilitada com override desabilitado na Startup Demo Aurora e `connections` global desabilitada com override habilitado na mesma organização.

### Solicitações institucionais (Etapa 1.7)

Interessados autenticados enviam solicitações de Startup ou Espaço de Inovação, que entram como **PENDING** e são analisadas em `/app/admin/cadastros`. Não há aprovação automática nem criação de organização no envio. Proteções: rate limiting, honeypot, bloqueio de solicitação duplicada do mesmo tipo por usuário (advisory lock). Termos/política são provisórios; apenas a versão aceita e o timestamp são persistidos. Usuários de seed para testes: `req.startup.new`, `req.espaco.new`, `req.pending` (com startup+espaço pendentes), `req.approved`, `req.rejected`, `req.mobile` (senha padrão do seed).

### Organizações, membros e convites (Etapa 1.8)

`/app/minha-organizacao` e `/app/admin/organizacoes/[id]` permitem editar nome, nome de exibição, descrição, site, cidade e estado (controle de concorrência otimista via `updatedAt`); apenas quem tem permissão global (`ADM_HUB`/`SUPER_ADMIN`) pode suspender/reativar uma organização. `/app/membros` (organização ativa) e `/app/admin/organizacoes/[id]/membros` (qualquer organização, para quem tem permissão) reúnem busca, filtros, paginação e ações de trocar papel, suspender, reativar e remover (lógico) — sempre bloqueando a ação que deixaria a organização sem administrador ativo. Convites: criados a partir de `/app/membros`, listados/revogados em `/app/convites`, aceitos ou recusados em `/convites/[token]` (rota autenticada, callback pós-login sempre saneado como caminho interno). Como não há envio real de e-mail, o link do convite é exibido apenas para quem criou (`invitations.manage`) — nunca gravado em log de produção, auditoria ou notificação. Usuários de seed para testes: `solo.admin` (organização com um único administrador, para testar o bloqueio do último admin), `membro.suspenso` (vínculo suspenso em Startup Demo Aurora), convites `convite.pendente`/`convite.expirado`/`convite.revogado` e um convite já aceito por `equipestartup` (todos `@dev.hubdigital.local`, senha padrão do seed).

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind CSS 4 · PostgreSQL 17 · Prisma 7 (driver adapter pg) · Auth.js v5 (beta) · Zod 4 · React Hook Form · Vitest · Docker Compose.

## Pré-requisitos

- Node.js 20+
- Docker Desktop
- npm

## Instalação e execução

```bash
npm install

# Banco de dados (usa POSTGRES_PORT do .env; padrão neste projeto: 5433)
docker compose up -d

# Variáveis de ambiente: crie .env na raiz com:
# POSTGRES_PORT=5433
# DATABASE_URL="postgresql://hub:hub_dev_password@localhost:5433/hub_digital"
# AUTH_SECRET="gere-um-segredo-com-openssl-rand-base64-32"
# AUTH_URL="http://localhost:3000"

# Migrations e seed
npx prisma migrate dev
npx prisma db seed

# Desenvolvimento
npm run dev
```

Scripts: `npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` · `npm run db:migrate` · `npm run db:seed`.

### Testes E2E (Playwright)

```bash
docker compose up -d       # banco precisa estar de pé
npm run test:e2e
```

O global-setup recria o banco **dedicado** `hub_digital_e2e` no mesmo container (drop/create via psql + `prisma migrate deploy` + seed) e sobe `next start` na porta 3100 (IPv4, `127.0.0.1`) com `DATABASE_URL` própria — o banco de desenvolvimento nunca é tocado. Cada cenário de cadastro cria o próprio registro isolado (`e2e/fixtures.ts` via `pg`) e limpa depois. Para apontar outro banco de teste, defina `E2E_DATABASE_URL` (adicione também ao seu `.env.example`/`.env` se desejar fixá-la).

> **Nota (Windows):** o runtime de produção do Next 16 pode travar a resposta de Server Actions com `revalidatePath` por ~20–30s de forma intermitente quando o antivírus varre as escritas em `.next`. Isso deixa a suíte E2E instável **apenas nesta condição de ambiente** (não é bug do código — ver `docs/decisoes-tecnicas.md`). Para uma execução confiável, exclua a pasta `.next` da varredura em tempo real do Windows Defender **ou** rode a suíte em CI/Linux.

## Credenciais de desenvolvimento (somente local — nunca usar em produção)

Senha de todos os usuários do seed: `HubDigital@dev1`

| Perfil                                                                        | E-mail                             |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| SUPER_ADMIN                                                                   | superadmin@dev.hubdigital.local    |
| ADM_HUB                                                                       | admhub@dev.hubdigital.local        |
| ADM_ESPACO_INOVACAO                                                           | admespaco@dev.hubdigital.local     |
| USUARIO_ESPACO_INOVACAO                                                       | usuarioespaco@dev.hubdigital.local |
| ADM_STARTUP                                                                   | admstartup@dev.hubdigital.local    |
| USUARIO_EQUIPE_STARTUP                                                        | equipestartup@dev.hubdigital.local |
| USUARIO_COMUM                                                                 | comum@dev.hubdigital.local         |
| Multiorganização (USUARIO_ESPACO_INOVACAO no Espaço + ADM_STARTUP na startup) | multi@dev.hubdigital.local         |

Todos os usuários acima têm o **onboarding concluído** (para não afetar os fluxos que vão direto ao painel). Usuários dedicados aos testes de onboarding (mesma senha):

| Estado do onboarding                     | E-mail                         | Finalidade                                   |
| ---------------------------------------- | ------------------------------ | -------------------------------------------- |
| Não iniciado                             | onb.none@dev.hubdigital.local  | Redirecionamento e validação (sem perfil)    |
| Não iniciado                             | onb.flow@dev.hubdigital.local  | Fluxo completo E2E (é alterado pelos testes) |
| Rascunho (Tenho uma ideia)               | onb.draft@dev.hubdigital.local | Retomada do rascunho salvo                   |
| Concluído (Tenho um time e uma solução…) | onb.done@dev.hubdigital.local  | Estado concluído / imutável                  |

O seed também cria: organizações (Hub Digital, Espaço de Inovação Centro, Startup Demo Aurora), papéis e permissões da Fase 1, planos de demonstração, solicitações de cadastro (pendentes/aprovada/reprovada/autoaprovação/payload inválido), perfis de onboarding, notificações e registros de auditoria.

### Onboarding (Etapa 1.6)

Classificação do estágio do usuário em 5 opções (Quero iniciar / Tenho uma ideia / Tenho uma ideia e um time / Tenho um time e uma solução pronta ou quase pronta / Tenho uma startup ou empresa). Estados: **NOT_STARTED** (sem registro), **DRAFT**, **COMPLETED**. Persistente por usuário, com rascunho, retomada, revisão e conclusão idempotente. Após o login, quem não concluiu vai para `/app/onboarding`; quem concluiu vai para `/app`. **Não** há cálculo de maturidade, pontuação nem recomendação automática (ver pendências). O onboarding independe de organização.

## Estrutura

```text
src/
├── app/            # (public), (auth), (dashboard), api
├── modules/        # domínios (auth implementado; demais em preparação)
├── lib/            # prisma, auth, rate-limit
├── generated/      # Prisma Client (gerado)
├── types/
prisma/             # schema, migrations, seed
docs/               # documentação funcional e técnica
public/             # identidade visual e assets oficiais
```

## Perfis e permissões

RBAC multiempresa: usuário → vínculo (Membership) por organização → papéis → permissões. Detalhes em [docs/matriz-permissoes.md](docs/matriz-permissoes.md).

## Feature flags

Flags globais criadas pelo seed (todas desabilitadas): coworking, events, ideation, projects, trends, reports, academy, payments, external-integrations. Avaliação no servidor; UI de gerenciamento pendente.

## Pendências principais

Regras não confirmadas pela gestão estão registradas em [docs/pendencias-negocio.md](docs/pendencias-negocio.md) — incluindo campos obrigatórios de cadastro, cálculo de maturidade, planos/valores, gateway de pagamento e licenciamento de fontes.
