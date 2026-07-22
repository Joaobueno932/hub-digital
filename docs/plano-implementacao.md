# Plano de implementação — Hub Digital

Fase 1 dividida em etapas pequenas. Cada etapa: objetivo, dependências, entregáveis, critérios de aceite (CA), testes, riscos, pendências.

## Etapa 1.1 — Scaffold e fundação

- **Objetivo:** projeto Next.js + TypeScript strict + Tailwind + tokens + estrutura modular.
- **Dependências:** versões atuais confirmadas (Context7).
- **Entregáveis:** app rodando, ESLint/Prettier, `docker-compose.yml` (PostgreSQL com healthcheck e volume), `.env.example`, tokens CSS/Tailwind.
- **CA:** `npm run dev`, `lint`, `typecheck`, `build` passam; banco sobe com `docker compose up`.
- **Testes:** smoke de build. **Riscos:** divergência de versões.

## Etapa 1.2 — Prisma e modelo de dados

- **Objetivo:** schema conforme `modelo-dados.md`, migration inicial, seed.
- **Dependências:** 1.1.
- **Entregáveis:** `schema.prisma`, migration versionada, `prisma/seed.ts` (7 usuários de papéis, Hub, espaço, startup, planos demo, flags, solicitações pendentes, notificações, audit logs).
- **CA:** `prisma migrate dev` e `db seed` reproduzíveis do zero.
- **Testes:** consulta de sanidade no seed. **Riscos:** retrabalho se pendências de negócio mudarem campos → payload JSONB em RegistrationRequest mitiga.

## Etapa 1.3 — Autenticação

- **Objetivo:** Auth.js credentials, cadastro, login, logout, sessão, reset de senha, verificação de e-mail preparada.
- **Dependências:** 1.2.
- **Entregáveis:** rotas `(auth)`, actions com Zod, hash argon2/bcrypt, anti-enumeração, interface de rate limit, middleware de proteção de `/app`.
- **CA:** fluxo completo manual + testes de serviço; nenhuma diferença observável entre e-mail existente/inexistente.
- **Testes:** unit de services (hash, tokens, enumeração), authz de middleware. **Riscos:** particularidades NextAuth v5 → validar docs via Context7.

> Status: 1.1–1.2 concluídas; 1.3 parcial (falta reset de senha/verificação de e-mail com envio real); **1.4 concluída em 2026-07-21**; **1.5 concluída em 2026-07-21** (listagem com filtros/paginação, detalhe com payload validado por Zod, aprovação/reprovação transacionais com OCC, bloqueio de autoaprovação, notificações, auditoria, Playwright configurado com banco E2E dedicado); 1.7/1.8 parcialmente antecipadas. Próxima: 1.6 (onboarding).

## Etapa 1.4 — RBAC e organização ativa

- **Objetivo:** serviços de permissões, `requirePermission`, seletor de organização ativa, menu por permissão/flag.
- **Dependências:** 1.3.
- **Entregáveis:** módulo permissions, guards em todas as actions, cookie de org ativa validado contra membership.
- **CA:** testes de autorização provando negação por padrão e anti-IDOR.
- **Testes:** matriz papel × ação (unit). **Riscos:** custo de queries → cache por request.

## Etapa 1.5 — Cadastro com aprovação

- **Objetivo:** solicitações de cadastro (usuário/startup/espaço), fila de análise, aprovação/reprovação com justificativa, reenvio, histórico, auditoria, notificações.
- **Dependências:** 1.4.
- **CA:** aprovação de startup cria Organization + Membership ADM_STARTUP; reprovação exige justificativa; tudo auditado.
- **Testes:** services + authz. **Pendências:** campos obrigatórios dos formulários (usar mínimos).

> **Etapa 1.6 concluída em 2026-07-21**: onboarding persistente (5 estágios, rascunho/retomada/revisão/conclusão), estados NOT_STARTED/DRAFT/COMPLETED, idempotência e OCC na finalização, redirecionamento pós-login centralizado, dashboard com estado do onboarding, auditoria e notificação, testes unitários/integração/Playwright. Sem cálculo de maturidade/recomendação (fora de escopo).

## Etapa 1.6 — Onboarding

- **Objetivo:** fluxo persistente de 5 estágios com salvar/continuar/revisar/finalizar.
- **Dependências:** 1.3.
- **CA:** progresso sobrevive a logout; sem cálculo de maturidade (pendência).
- **Testes:** service de persistência/transições.

## Etapa 1.7 — Ambiente interno

- **Objetivo:** layout autenticado (header, sidebar por permissão, mobile), dashboard inicial, perfil, notificações, páginas "em preparação" dos módulos futuros, estados vazio/loading/erro/sem permissão.
- **Dependências:** 1.4.
- **CA:** menu reflete permissões e flags; acesso direto por URL negado no servidor.

## Etapa 1.8 — Administração

- **Objetivo:** `/app/admin`: usuários (lista, busca, filtros, visualização), organizações (CRUD básico), membros, solicitações, auditoria (leitura), feature flags.
- **Dependências:** 1.5.
- **CA:** cada tela paginada, com busca, protegida por permissão, com auditoria nas mutações.

## Etapa 1.9 — Ambiente público

- **Objetivo:** landing page com identidade oficial (assets.json, hero/acceleration/footer webp), login/cadastro/recuperação estilizados, institucionais mínimas.
- **Dependências:** 1.1 (visual), 1.3 (auth).
- **CA:** responsiva, acessível, sem Lorem Ipsum (textos provisórios marcados como editáveis).

## Etapa 1.10 — Quality gate final

- **Objetivo:** typecheck, lint, testes, build, Playwright dos fluxos principais, revisão de segurança, README completo.
- **CA:** critérios de conclusão da Fase 1 do CLAUDE.md atendidos; relatório com resultados reais.

> **Etapa 1.7 concluída em 2026-07-22**: formulários públicos de solicitação de Startup e Espaço de Inovação (RHF + Zod), exigindo autenticação; serviço de submissão com rate limiting (usuário + IP anonimizado), honeypot, advisory lock transacional para duplicidade/concorrência, auditoria e notificação de administradores; página de sucesso; "Minhas solicitações"; páginas legais provisórias; compatível com a aprovação existente (payload compartilhado). Sem migration. Testes unit/integração/Playwright.

## Fases futuras (resumo)

Fase 2 Coworking + Eventos; Fase 3 Ideação; Fase 4 Projetos; Fase 5 Tendências/pagamentos; Fase 6 Academy/integrações — conforme CLAUDE.md, cada uma com nova rodada de auditoria das regras confirmadas no PDF.
