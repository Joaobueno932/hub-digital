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