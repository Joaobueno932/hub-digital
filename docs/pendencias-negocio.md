# Pendências de negócio — Hub Digital

Este documento registra dúvidas e decisões que precisam ser confirmadas antes ou durante o desenvolvimento.

## Adicionadas pela auditoria de 2026-07-21

- O fluxo de "solicitar cadastro por WhatsApp" (story map do Adm Espaço Inovação) continua válido? Como deve ser tratado dentro da plataforma?
- A justificativa obrigatória em reprovação está confirmada apenas para eventos (Eventos RN03). Vale também para reprovação de cadastros? (Adotada como proposta no MVP.)
- "Deletar usuário" (Portal US-03) deve ser exclusão física ou desativação? (Adotada exclusão lógica/desativação no MVP.)
- Os três tipos de "plano" do documento (portal, coworking, gestão de projetos start/run/accelerate) são o mesmo catálogo ou catálogos distintos?
- Quais campos são obrigatórios nos formulários de cadastro de usuário, startup e espaço de inovação? (MVP usa mínimos: nome, e-mail, telefone, nome da organização.)
- O cálculo do nível de maturidade (ideia > time > solução > start/run/accelerate I–III) e o questionário de pré-análise: existe versão atual das perguntas e da pontuação?
- Os painéis do dashboard do usuário (Agenda, Minha evolução, Academy, Conexões, Mentorias, Editais, Verticais, Vagas) valem para quais perfis exatamente?
- Fontes Nexa/Gotham não têm licenciamento confirmado; MVP usa Lexend (Google Fonts). Confirmar tipografia oficial.
- O contraste do laranja `#E85D04` como texto pequeno sobre branco não atinge AA; confirmar ajustes de tom permitidos.
- Revalidação das telas no Figma pendente: o conector Figma MCP não estava autenticado durante a auditoria.

## Adicionadas na Etapa 1.5 (2026-07-21)

- O fluxo de correção e reenvio de solicitações reprovadas ("reprovação pode ser corrigida e reenviada?") segue sem regra confirmada — estados NEEDS_CORRECTION/RESUBMITTED reservados, não implementados.
- Aprovação de solicitação de USUÁRIO sem conta prévia: como o solicitante recebe credenciais? (Hoje a decisão é registrada; o convite/criação de conta ficará para fluxo futuro.)
- Reabertura de solicitação REJEITADA ou APROVADA exige regra explícita da gestão (não implementada).
- Quem além de ADM_HUB/SUPER_ADMIN poderá revisar cadastros (ex.: espaço aprovando startups do próprio espaço)?

## Adicionadas na Etapa 1.6 — Onboarding (2026-07-21)

- O usuário poderá **alterar o estágio após a conclusão**? (Hoje COMPLETED é final, sem sobrescrita.)
- Haverá **histórico de reavaliações** do estágio?
- O onboarding será **obrigatório** para todos os perfis (inclusive administradores institucionais)?
- Haverá **perguntas adicionais por tipo de estágio** (além da classificação)?
- O resultado do onboarding **influenciará planos**, conteúdos, serviços, mentorias ou aceleração? Como?
- Haverá **cálculo de maturidade** separado da classificação de estágio?
- Haverá **recomendações automáticas** a partir do estágio?
- Qual equipe poderá **consultar resultados agregados** de onboarding?

## Adicionadas na Etapa 1.7 — Solicitações institucionais (2026-07-22)

- Solicitação institucional **exige conta**? (Adotado: sim, requer autenticação.)
- Haverá **confirmação de e-mail** antes da análise?
- **Telefone** é obrigatório? (Adotado: opcional; origem story maps.)
- **CNPJ** será obrigatório? Serão exigidos **documentos**?
- Solicitação **rejeitada poderá ser corrigida/reenviada**? (Hoje bloqueado, sem reabertura.)
- Qual **prazo de análise** poderá ser divulgado? (Hoje nenhum prazo é prometido.)
- Quais administradores recebem notificação? (Adotado: ADM_HUB/SUPER_ADMIN do Hub.)
- **Termos e política definitivos** (LGPD): responsável pelo tratamento, retenção, canais.
- **Consentimento de marketing** será separado dos termos?
- Como tratar **solicitações duplicadas por organização já existente** (mesmo CNPJ/nome)?
- ~~**Convite/ativação** para solicitante aprovado sem conta (não implementado nesta fase).~~ **Resolvido na Etapa 1.8**: fluxo de convite completo (criação, aceitação, recusa, revogação, expiração).
- Endurecimento anti-abuso: tempo mínimo de submissão e índice único parcial (hoje advisory lock).

## Adicionadas na Etapa 1.8 — Organizações, membros e convites (2026-07-22)

- Prazo definitivo do convite: hoje fixo em 7 dias (`INVITATION_EXPIRATION_DAYS`), sem confirmação de gestão sobre o valor correto.
- Reenvio de convite (gerar novo token para o mesmo e-mail/organização sem esperar expirar) não está implementado — hoje é preciso revogar e criar um novo.
- Modelo de e-mail transacional (texto, remetente, identidade visual) não definido — envio real de e-mail não está implementado nesta etapa.
- Transferência de administrador principal (situações em que o único administrador precisa transferir a função antes de sair) não tem fluxo dedicado — hoje só é possível promover outro membro antes de sair.
- Quantidade máxima de membros por organização não definida (hoje sem limite).
- Necessidade de justificativa obrigatória para suspensão/remoção de membro não confirmada (hoje opcional/ausente, diferente da reprovação de cadastro que exige).
- Possibilidade de um usuário ter dois vínculos ativos simultâneos na mesma organização: hoje bloqueada por design (`unique(userId, organizationId)` em `Membership`).
- Campos institucionais definitivos da organização (CNPJ, endereço completo, dados jurídicos) continuam indefinidos — apenas nome, nome de exibição, descrição, site, cidade e estado foram implementados.
- Política de suspensão de organização (quem é notificado, prazo de reversão, efeito sobre dados/arquivos da organização) não está definida além do bloqueio de acesso já implementado.
- Papéis para organizações do tipo EMPRESA/MANTENEDOR/PARCEIRO não foram definidos — convites e trocas de papel para esses tipos ficam bloqueados até a definição.

## Adicionadas na Etapa 1.9 — Usuários e feature flags (2026-07-22)

- **"Último acesso" não existe**: não há `lastLoginAt`, a tabela `Session` fica vazia (sessão JWT) e não há auditoria de login. Exibir a coluna exigiria decidir entre adicionar campo no `User` (atualizado a cada login) ou registrar login em `AuditLog` — cada opção tem custo de escrita e implicação de privacidade. **Definir a estratégia antes de prometer o dado.**
- **Alteração de e-mail pela administração** continua bloqueada (somente leitura): exige fluxo de confirmação no endereço novo (e provavelmente no antigo) para não permitir tomada de conta. Definir o fluxo.
- **Notificação de mudança de disponibilidade de módulo**: hoje ninguém é avisado quando uma flag muda. Notificar todos os usuários a cada alteração geraria ruído desproporcional. Definir se haverá aviso, para quem e com qual agregação.
- **`DEACTIVATED`** está no enum mas sem fluxo: falta decidir se é desativação a pedido do próprio usuário (LGPD) e como se relaciona com `deletedAt`.
- **Papéis das organizações EMPRESA/MANTENEDOR/PARCEIRO** seguem indefinidos (herdado da Etapa 1.8), o que mantém convites e trocas de papel bloqueados nesses tipos.
- **Critério de flags sensíveis**: hoje `payments` e `external-integrations` são `superAdminOnly` por decisão técnica (efeito financeiro/externo). Confirmar com a gestão se a lista está correta.

### Pendências técnicas (dívida conhecida, não são decisões de negócio)

- ~~**Auditoria de tentativa bloqueada dentro de transação**~~ — **RESOLVIDO**. Todos os serviços (`approve-registration`, `reject-registration`, `suspend-user`, `update-organization`, `set-global-flag`, `accept-invitation`, `suspend-membership`, `complete-onboarding` etc.) gravam auditorias de bloqueio/conflito (`*_blocked`, `*.processing_conflict`, `self_review_blocked`, `last_super_admin_blocked`) **fora** da transação: pré-checagens antes do `try` e conflitos de corrida no `catch` (`prisma.auditLog`, não `tx`). Coberto por testes de integração que provam a persistência após o rollback.
- ~~**Suíte E2E instável quando os specs de cadastro rodam juntos**~~ — **isolamento resolvido**. `registrations.spec.ts` foi reescrito para criar o próprio registro por cenário (helper `e2e/fixtures.ts` via `pg`, nome único, navegação direta por `requestId`, limpeza no `finally`); `registrations-public.spec.ts` usa usuários de seed dedicados + registros próprios. Ambos passam isoladamente e não compartilham registros mutáveis. O `pool` do Prisma foi corrigido (`src/lib/prisma.ts`: `max`/`connectionTimeoutMillis`, cache único — o `connection_limit` da URL é ignorado pelo driver adapter). Também foi corrigido um bug de teardown que introduzimos (o `pool.end()` no `afterAll` derrubava o pool compartilhado do worker — agora `allowExitOnIdle`, sem `end()` manual).
- **Stall ambiental do runtime de produção do Next 16 (Windows) — EM ABERTO, não é do código.** Mesmo com o isolamento acima, a suíte E2E completa não fecha 100% verde de forma confiável nesta máquina: Server Actions de mutação que chamam `revalidatePath` travam a resposta ~20–30s em ~40% das execuções, de forma intermitente. Descartados banco, pool, memória, código dos serviços, Turbopack↔webpack e IPv4↔IPv6 (ver `docs/decisoes-tecnicas.md`, seção "Estabilização da suíte E2E", item 6). Provável varredura em tempo real do antivírus sobre as escritas em `.next`. Mitigação recomendada: excluir `.next` da varredura do Defender **ou** rodar a suíte E2E em CI/Linux. Não mascarado com retries nem timeouts inflados.

## Escopo

- Qual é o escopo definitivo do MVP?
- Quais módulos deverão estar funcionando na primeira entrega?
- Quais módulos deverão aparecer apenas como indisponíveis ou em desenvolvimento?
- Existe um cronograma ou ordem de prioridade definida pela gestão?

## Identidade visual

- Qual dos três arquivos do Figma será a referência visual principal?
- A landing page colorida representa a identidade definitiva?
- As telas em escala de cinza deverão ser redesenhadas utilizando a identidade da landing page?
- Quais logos possuem aprovação institucional?
- Quais fontes estão licenciadas para uso no sistema?

## Usuários e organizações

- Um usuário poderá pertencer a mais de uma organização?
- Um usuário poderá possuir papéis diferentes em organizações distintas?
- Quem poderá criar uma organização?
- Quais cadastros precisarão de aprovação?
- Quem poderá aprovar cada tipo de cadastro?
- Uma reprovação poderá ser corrigida e reenviada?

## Perfis e permissões

- Quais permissões pertencem a cada perfil?
- Administradores de espaços poderão criar perfis personalizados?
- Administradores de startups poderão definir permissões para os membros?
- Existe um perfil técnico com acesso global ao sistema?

## Planos e assinaturas

- Quais planos continuam válidos?
- Quais são os valores atuais?
- Existem planos mensais, anuais ou por projeto?
- O cancelamento é imediato ou ocorre ao final do período?
- Haverá período gratuito?
- Quais módulos e recursos cada plano libera?

## Pagamentos

- Qual gateway de pagamento será utilizado?
- Mercado Pago continua sendo a opção oficial?
- Haverá pagamento por PIX, boleto e cartão?
- O sistema deverá emitir nota fiscal?
- Como funcionarão estornos e reembolsos?
- Existe integração com ERP ou sistema financeiro da FIEMS?

## Coworking

- Quais espaços físicos participarão inicialmente?
- Quem definirá os preços das salas?
- Reservas precisarão ser aprovadas?
- Qual é a política de cancelamento?
- O prazo de 15 minutos para check-in continua válido?
- Como será realizado o check-in?
- Haverá QR Code?
- Será permitido reservar sem realizar pagamento?

## Eventos

- A integração com Sympla continua válida?
- O evento será criado no Hub, no Sympla ou nos dois?
- O Hub armazenará participantes ou apenas redirecionará para o Sympla?
- Todos os eventos precisarão de aprovação?
- Haverá eventos gratuitos e pagos?

## Ideação

- Quais tipos de campanha existirão?
- Quem poderá criar desafios?
- Como serão selecionados os avaliadores?
- Como será calculada a pontuação?
- Pontos poderão expirar?
- Haverá uma loja real de produtos e prêmios?
- Como será controlada a entrega ou retirada dos prêmios?

## Gestão de projetos

- Quais níveis de maturidade continuam válidos?
- Como o nível de maturidade será calculado?
- Quem poderá alterar o nível de uma startup?
- Os planos de trabalho serão modelos fixos ou configuráveis?
- Quais etapas serão obrigatórias?
- Como serão emitidos certificados?

## Tendências e negócios

- Quais fontes de dados deverão ser integradas?
- Os dashboards serão internos ou incorporados de outra ferramenta?
- Qual ferramenta de BI será utilizada?
- Quem poderá criar relatórios?
- Quem poderá comercializar relatórios?
- Como será definido o valor de cada relatório?

## Academy

- O Academy será desenvolvido dentro do Hub?
- Haverá apenas redirecionamento para o LMS SESI Startup?
- Existirá autenticação única entre as plataformas?
- O progresso dos cursos será exibido no Hub?

## Autenticação

- Haverá autenticação por e-mail e senha?
- Login com Google e LinkedIn continua previsto?
- Será utilizado SSO institucional?
- Haverá integração com Microsoft Entra ID ou Keycloak?
- O cadastro será aberto ao público?

## Conteúdo institucional

- Quem administrará blog, páginas, serviços e conteúdos públicos?
- Será necessário um CMS?
- Os conteúdos precisarão de aprovação antes da publicação?
- Haverá múltiplos autores?

## LGPD

- Quem será o responsável pelo tratamento dos dados?
- Qual será o período de retenção dos dados?
- Como o usuário solicitará exclusão da conta?
- Quais termos e políticas precisam ser apresentados?
- Currículos e documentos possuirão prazo de retenção?

## Integrações

- Existe documentação atual das APIs previstas?
- Existem ambientes de homologação?
- Quem fornecerá as credenciais?
- Há integração obrigatória com sistemas internos da FIEMS?
