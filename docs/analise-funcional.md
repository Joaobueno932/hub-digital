# Análise funcional — Hub Digital

Data da auditoria: 2026-07-21.

Fontes analisadas:

- `docs/requisitos/Documento HUB Digital - 06.09.2022 1.pdf` (66 páginas — regras de negócio, histórias de usuário, story maps do Miro e diagramas de dados legados);
- `CLAUDE.md`;
- `docs/escopo-mvp.md`, `docs/decisoes-tecnicas.md`, `docs/pendencias-negocio.md`;
- `docs/design/brand-guide.md`, `docs/design/tokens.css`, `docs/design/tokens.json`;
- `docs/figma/links.md`, `docs/figma/asset-manifest.md`;
- `public/assets.json`, `public/brand/`, `public/images/`, `public/references/figma/`;
- exports das páginas do documento em `references/figma/` (páginas 55–66, story maps de Tendências e Negócios e diagramas de entidades).

Limitação registrada: o conector Figma MCP não estava autenticado durante esta auditoria. Os três arquivos do Figma (landing/identidade, ambiente interno, ambiente externo) não puderam ser inspecionados frame a frame; a análise visual apoiou-se nos exports locais e no brand-guide. **Pendência:** revalidar telas diretamente no Figma quando o conector estiver autorizado.

Classificação usada:

- **[RC]** requisito confirmado pelo documento de requisitos;
- **[FG]** informação encontrada no Figma/exports;
- **[INF]** inferência;
- **[DT]** decisão técnica;
- **[INC]** inconsistência ou duplicidade;
- **[PN]** pendência de negócio (detalhada em `pendencias-negocio.md`);
- **[MVP]** pertence ao MVP; **[FUT]** fase futura.

---

## 1. Objetivo do Hub Digital

[RC] Plataforma única para o ecossistema de inovação (FIEMS/SESI é citada no documento como destino de pagamentos e emissora de NF via RP/CRM), reunindo portal, coworking, eventos, ideação, gestão de projetos/aceleração, tendências e negócios (BI e relatórios) e Academy (LMS SESI Startup).

[RC] Módulos são liberados conforme **plano adquirido** e **nível de maturidade** do usuário (Portal RN-05).

## 2. Públicos atendidos

[RC] Personas do documento: Adm Hub Digital, Adm Espaço Inovação, Usuário Espaço Inovação, Adm Incubado (= responsável por startup/empresa incubada), Usuário Equipe Incubado, Usuário Comum, além do público visitante deslogado (Portal RN-06).

[DT] O CLAUDE.md padroniza os nomes: SUPER_ADMIN (não existe no documento de 2022; é decisão técnica), ADM_HUB, ADM_ESPACO_INOVACAO, USUARIO_ESPACO_INOVACAO, ADM_STARTUP (= Adm Incubado), USUARIO_EQUIPE_STARTUP, USUARIO_COMUM.

[INC] O documento usa "Adm Incubado"/"Adm Encubados" (grafia inconsistente) e o CLAUDE.md usa "ADM_STARTUP". Tratados como o mesmo papel.

## 3. Ambientes

- [RC] Ambiente público: conteúdo sucinto para visitantes; cadastro obrigatório para conteúdo freemium (RN-01/02); plano pago para conteúdo pago (RN-03/04). [MVP]
- [RC] Ambiente autenticado: dashboard com painéis (Agenda, Minha evolução, Startup Academy, Conexões, Mentorias, Editais e desafios, Verticais, Vagas — story map do Adm Incubado), escolha de módulo, perfil. [MVP: casca; painéis reais FUT]
- [DT] Ambiente administrativo em `/app/admin` conforme CLAUDE.md. [MVP básico]

## 4. Módulos e divisão MVP × futuro

| Módulo                                                                                                                                                       | Fonte | MVP     | Observação                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portal (usuários, login, cadastro, aprovação, vagas, serviços, planos, conexões, agenda, mentorias, currículo)                                               | RC    | Parcial | MVP: usuários, auth, cadastro+aprovação, organizações, permissões, onboarding. Vagas, serviços, conexões, agenda, mentorias, currículo = FUT (rotas reservadas).                                                                                                                 |
| Coworking (salas, reservas, check-in/out, planos, relatórios)                                                                                                | RC    | Não     | FUT — Fase 2. Regras já confirmadas: exclusão lógica de sala com reserva (RN-02), pagamento antes de alugar (RN-03), reembolso ao desativar sala com agendamento (RN-04), 15 min para check-in (RN-05), Mercado Pago para recebimento (story map).                               |
| Eventos e comunidade                                                                                                                                         | RC    | Não     | FUT — Fase 2. Integração/redirecionamento Sympla (RN01/EN02), justificativa obrigatória na reprovação (RN03), aprovação por ADM Hub/Espaço.                                                                                                                                      |
| Ideação (campanhas, desafios, etapas, documentos, avaliação, pontos, galeria de troca, feed de notícias)                                                     | RC    | Não     | FUT — Fase 3. 21 RNs confirmadas (até 5 avaliadores por etapa, média das notas, documentos nunca apagados, pontos por galeria com validade, campanha = ADM Hub/Espaço, desafio = empresa/Adm Incubado, etc.).                                                                    |
| Gestão de Projetos (pré-análise de maturidade, planos start/run/accelerate I–III, planos de trabalho, checklists, serviços, mentorias, certificados, badges) | RC    | Não     | FUT — Fase 4. RNs confirmadas: só o líder responde a pré-análise (RN-01), accelerate III não compra plano (RN-02), compra restrita ao nível atual (RN-03), contrato e NF por e-mail (RN-06/07), resultado da pré-análise por e-mail ao time (RN-08). Pagamento via RP/CRM FIEMS. |
| Tendências e Negócios (bases de dados BI, dashboards, relatórios criados/adquiridos)                                                                         | RC    | Não     | FUT — Fase 5. Relatório do Adm Espaço precisa de aprovação do Adm Hub (RN-03); relatório reprovado é excluído (RN-02); pago → listado em "adquiridos" (RN-01).                                                                                                                   |
| Academy                                                                                                                                                      | RC    | Não     | FUT — Fase 6. Documento indica uso da plataforma LMS do SESI STARTUP.                                                                                                                                                                                                            |

## 5. Jornadas principais confirmadas (story maps)

- [RC] Cadastro: preencher formulário (nome, telefone, e-mail), confirmar solicitação; solicitação de cadastro também por WhatsApp (Adm Espaço Inovação — [INC] canal não estruturado, ver pendências). Aprovação/reprovação por ADM Hub Digital (US-07/08), com visualização dos dados da solicitação.
  - **Implementado na Etapa 1.9**: administração central de usuários (listagem com filtros, detalhe, suspensão/reativação com motivo e histórico) e gerenciamento visual de feature flags (global + override por organização), fechando o item "administração básica" da Fase 1 do CLAUDE.md. "Deletar usuário" (US-03) permanece como **exclusão lógica/suspensão**, nunca física.
  - **Implementado na Etapa 1.8**: gestão de organizações (edição, suspensão/reativação), membros (papéis, suspensão/reativação/remoção lógica, proteção do último administrador) e convite de novos membros (com ou sem conta prévia) por token — resolve a lacuna de "como o solicitante aprovado sem conta recebe acesso", registrada como pendência na Etapa 1.5. Envio real de e-mail continua não implementado (ver `docs/pendencias-negocio.md`).
- [RC] Login com usuário/senha; documento cita também "Acessar com Single sign on" (fluxo Gestão de Projetos) e validação de e-mail no primeiro acesso.
- [RC] Onboarding (módulo Gestão de Projetos): vídeo comercial, questionário de pré-análise de maturidade ("Em qual nível estou?"), cadastro de informações de ideia/time/solução/empresa, apresentação de resultados (ideia > time > solução > nível start/run/accelerate I–III), sugestão de serviços conforme análise. [MVP: coleta e persistência do estágio; cálculo do nível e recomendações = PN/FUT]
  - **Implementado na Etapa 1.7**: formulários públicos de solicitação de Startup e Espaço de Inovação, que alimentam o fluxo administrativo de aprovação/reprovação (Etapa 1.5). Exigem autenticação; não criam organização automaticamente. Campos confirmados vs. pendentes documentados em `docs/decisoes-tecnicas.md` e `docs/pendencias-negocio.md`.
  - **Implementado na Etapa 1.6**: classificação em 5 estágios (Quero iniciar / Tenho uma ideia / Tenho uma ideia e um time / Tenho um time e uma solução pronta ou quase pronta / Tenho uma startup ou empresa), persistente por usuário, com rascunho, retomada, revisão e conclusão. **Não** há cálculo de maturidade, pontuação nem recomendação automática (registrado como pendência). O onboarding independe de organização ativa.
- [RC] Compra de plano: escolher plano, aceitar termos, pagar (cartão; dados enviados ao RP FIEMS; NF emitida pelo RP/CRM FIEMS e enviada por e-mail), acesso liberado; cancelar plano; mudar de plano. [FUT]
- [RC] Currículo (Usuário Comum): nome, telefone, e-mail, anexo, links. [FUT]

## 6. Regras confirmadas (transversais)

- [RC] Cadastros passam por aprovação do ADM Hub (Portal US-07/08); reprovação de evento exige justificativa (Eventos RN03) — [INF] estendemos justificativa obrigatória a qualquer reprovação de cadastro (proposta, validar).
- [RC] Exclusões com histórico são lógicas (Coworking RN-02; Ideação RN-08).
- [RC] Acesso a módulos condicionado a plano + maturidade (Portal RN-05).
- [RC] Deleção de usuário existe nas histórias (US-03) — [DT] implementada como desativação/exclusão lógica.

## 7. Regras inferidas ([INF])

- Multiorganização: o documento não afirma explicitamente que uma pessoa tem papéis diferentes em organizações diferentes; CLAUDE.md confirma como diretriz do projeto. Modelado via Membership/Role.
- E-mail/senha como método de autenticação primário do MVP (documento cita "usuário e senha").
- A "solicitação de cadastro" de startup e espaço de inovação cria a organização somente após aprovação.
- Perfis em escala de cinza do Figma são wireframes funcionais, não identidade visual (instrução do projeto).

## 8. Inconsistências e duplicidades ([INC])

1. Nomenclatura de papéis: "Adm Incubado" × "Adm Encubados" × "ADM_STARTUP"; "Usuário Equipe" × "Usuário Equipe Incubado".
2. Numeração duplicada no PDF: Coworking tem dois "US 4"; Ideação repete "4.2.4".
3. Modelo de dados legado (páginas 61–66) conflita com as diretrizes atuais: tabela `Usuario` com `PerfilUsuario` fixo, senha em tabela `Login` própria, entidades duplicadas de `Pagamento` por módulo, endereços separados por módulo. Não será replicado ([DT] — modelo novo em `modelo-dados.md`).
4. Fluxo de cadastro por WhatsApp (story map) sem regra estruturada.
5. Documento prevê deleção física de usuário (US-03) mas outros trechos exigem histórico — resolvido por exclusão lógica ([DT]).
6. Sympla: RN01 fala em página de redirecionamento; pendências questionam se o evento vive no Hub, no Sympla ou em ambos.
7. Planos aparecem em três contextos distintos (planos do portal, planos de coworking, planos de gestão de projetos start/run/accelerate) sem unificação clara.
8. Documento de 2022 pode estar desatualizado em valores, planos e integrações (registrado como PN).

## 9. Dependências externas

[RC] Sympla (eventos), Mercado Pago (coworking), RP/CRM FIEMS (NF e pagamentos de planos), LMS SESI Startup (Academy), BI (Tendências). [DT] Todas atrás de interfaces/adaptadores com mocks no MVP.

## 10. Divisão final

- **MVP (esta entrega):** fundação técnica, auth, cadastro e aprovação, organizações e vínculos, RBAC, onboarding persistente, dashboard casca, admin básico, feature flags, auditoria, notificações básicas, landing page, seed.
- **Futuro:** Coworking, Eventos, Ideação, Projetos, Tendências, Academy, pagamentos, conexões, mentorias, vagas, serviços, currículos, relatórios — presentes apenas como rotas reservadas, flags e páginas "em preparação".
