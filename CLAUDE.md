# Projeto Hub Digital

Você está trabalhando no desenvolvimento do Hub Digital, uma plataforma modular para gestão de um ecossistema de inovação.

Antes de escrever qualquer código, leia integralmente:

1. `docs/requisitos/Documento HUB Digital - 06.09.2022.pdf`
2. `docs/figma/links.md`
3. `docs/escopo-mvp.md`
4. `docs/decisoes-tecnicas.md`
5. `docs/pendencias-negocio.md`
6. Todos os arquivos existentes no repositório.

Não comece implementando telas isoladas sem compreender a arquitetura geral.

---

## 1. Objetivo da plataforma

O Hub Digital deve reunir em uma única plataforma:

- portal institucional público;
- cadastro e autenticação;
- onboarding e classificação da maturidade dos usuários;
- startups e empresas;
- espaços de inovação;
- membros e equipes;
- planos e assinaturas;
- coworking;
- eventos;
- campanhas e desafios de inovação;
- gestão de ideias;
- projetos de aceleração;
- mentorias;
- conexões;
- serviços;
- vagas;
- dashboards;
- relatórios;
- conteúdos educacionais;
- integrações externas.

A plataforma não é um site institucional simples. Trata-se de um sistema multiusuário, multiempresa, modular e com permissões específicas.

---

## 2. Módulos funcionais

O sistema possui os seguintes módulos principais:

1. Portal
2. Coworking
3. Eventos e comunidade
4. Ideação
5. Gestão de Projetos
6. Tendências e Negócios
7. Academy

Os módulos devem ser desacoplados, mas compartilhar autenticação, usuários, organizações, planos, arquivos, notificações, auditoria e permissões.

Utilize feature flags para permitir que módulos sejam habilitados ou desabilitados sem remover código.

---

## 3. Perfis principais

Considere inicialmente os seguintes perfis:

### SUPER_ADMIN

Equipe técnica com acesso administrativo total.

### ADM_HUB

Administrador geral do Hub Digital.

Pode:

- gerenciar usuários;
- aprovar cadastros;
- administrar planos;
- administrar serviços;
- administrar vagas;
- aprovar eventos;
- administrar relatórios;
- configurar permissões;
- visualizar informações gerais da plataforma.

### ADM_ESPACO_INOVACAO

Administrador de um espaço de inovação.

Pode:

- administrar membros do espaço;
- gerenciar salas;
- gerenciar reservas;
- cadastrar eventos;
- acompanhar startups;
- administrar serviços vinculados ao espaço;
- visualizar dashboards e relatórios permitidos.

### USUARIO_ESPACO_INOVACAO

Colaborador de um espaço de inovação.

Possui permissões operacionais definidas pelo administrador do espaço.

### ADM_STARTUP

Responsável por uma startup ou empresa incubada.

Pode:

- administrar a organização;
- administrar membros da equipe;
- contratar planos;
- acompanhar a evolução;
- participar de desafios;
- gerenciar projetos;
- solicitar serviços e mentorias.

### USUARIO_EQUIPE_STARTUP

Membro de uma startup.

Pode participar de atividades, desafios, projetos e mentorias conforme sua permissão.

### USUARIO_COMUM

Usuário cadastrado sem vínculo administrativo.

Pode acessar funcionalidades públicas ou contratadas, participar de eventos, enviar currículo, adquirir planos ou reservar espaços, conforme as regras vigentes.

Não confie apenas no nome do perfil para autorizar uma ação. Implemente permissões granulares.

---

## 4. Modelo organizacional

A plataforma deve ser multiempresa.

Entidades organizacionais iniciais:

- Hub Digital;
- Espaço de Inovação;
- Startup;
- Empresa;
- Mantenedor;
- Parceiro.

Uma pessoa pode possuir vínculos diferentes em organizações diferentes.

Exemplo:

- administrador em uma startup;
- membro em um espaço;
- participante comum em um evento.

Modele isso por meio de associações entre usuário, organização, papel e permissões.

Não salve apenas um campo `role` fixo na tabela de usuários.

Estrutura conceitual:

- User
- Organization
- Membership
- Role
- Permission
- RolePermission
- MembershipRole

---

## 5. Arquitetura recomendada

Crie inicialmente uma aplicação web full-stack modular.

Stack preferencial:

- Next.js com App Router;
- TypeScript com modo strict;
- PostgreSQL;
- Prisma ORM;
- autenticação compatível com Auth.js;
- React Hook Form;
- Zod;
- TanStack Query quando houver necessidade de cache do lado cliente;
- Tailwind CSS;
- componentes acessíveis baseados em Radix UI ou shadcn/ui;
- Vitest para testes unitários;
- Playwright para testes de fluxo;
- armazenamento de arquivos compatível com S3;
- Docker Compose para ambiente local.

Use versões estáveis e suportadas. Não instale bibliotecas duplicadas para a mesma finalidade.

Mantenha a possibilidade futura de substituir a autenticação por Keycloak ou outro provedor corporativo.

---

## 6. Organização do código

Utilize uma arquitetura modular por domínio.

Estrutura esperada:

```text
src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── organizations/
│   ├── memberships/
│   ├── permissions/
│   ├── onboarding/
│   ├── plans/
│   ├── subscriptions/
│   ├── payments/
│   ├── coworking/
│   ├── events/
│   ├── ideation/
│   ├── projects/
│   ├── trends/
│   ├── reports/
│   ├── academy/
│   ├── notifications/
│   ├── files/
│   └── audit/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   └── feedback/
│
├── lib/
├── config/
├── hooks/
├── types/
└── styles/

Cada módulo deve possuir, quando aplicável:

module-name/
├── components/
├── actions/
├── services/
├── repositories/
├── schemas/
├── permissions/
├── types/
└── tests/

Regras de negócio não devem ficar diretamente em componentes React ou em arquivos de página.

7. Rotas principais
Ambiente público
/
/quem-somos
/startups
/startups/[slug]
/mantenedores
/servicos
/servicos/[slug]
/eventos
/eventos/[slug]
/blog
/blog/[slug]
/planos
/vagas
/vagas/[slug]
Autenticação
/login
/cadastro
/recuperar-senha
/verificar-email
/cadastro/startup
/cadastro/espaco-inovacao
Ambiente interno
/app
/app/onboarding
/app/minha-organizacao
/app/membros
/app/agenda
/app/conexoes
/app/mentorias
/app/evolucao
/app/planos
/app/coworking
/app/eventos
/app/ideacao
/app/projetos
/app/tendencias
/app/relatorios
/app/academy
/app/configuracoes
Administração
/app/admin
/app/admin/usuarios
/app/admin/cadastros
/app/admin/organizacoes
/app/admin/perfis
/app/admin/permissoes
/app/admin/planos
/app/admin/servicos
/app/admin/eventos
/app/admin/vagas
/app/admin/relatorios
/app/admin/auditoria
8. Identidade visual

Utilize o Figma como referência visual.

Existem três referências:

conceito visual e landing page;
ambiente externo;
ambiente interno.

A identidade visual mais elaborada da landing page utiliza inicialmente:

cor primária: #182F4F;
cor escura: #0C1B2A;
cor secundária: #BCCE2D;
cor de destaque e botões: #E85D04;
fundo claro: #EAEAEA.

Transforme essas cores em design tokens.

Exemplo:

:root {
  --brand-primary: #182f4f;
  --brand-primary-dark: #0c1b2a;
  --brand-secondary: #bcce2d;
  --brand-accent: #e85d04;
  --brand-background: #eaeaea;
}

Não replique as posições absolutas do Figma literalmente.

O layout deve ser:

responsivo;
acessível;
adaptável a diferentes textos;
compatível com desktop, tablet e celular;
construído com grid, flexbox e componentes reutilizáveis.

O Figma possui telas antigas e algumas inconsistências. Preserve a identidade visual, mas não replique problemas de usabilidade.

Não utilize Lorem Ipsum nas telas finais da primeira fase. Use textos realistas em português.

9. Onboarding e classificação

Após o cadastro, o sistema deve permitir classificar o estágio do usuário:

Quero iniciar.
Tenho uma ideia.
Tenho uma ideia e um time.
Tenho um time e uma solução pronta ou quase pronta.
Tenho uma startup ou empresa.

O onboarding deve ser persistido e permitir continuidade posterior.

O resultado poderá futuramente influenciar:

serviços recomendados;
planos disponíveis;
conteúdos;
mentorias;
projetos de aceleração;
nível de maturidade.

Não implemente regras definitivas de recomendação sem confirmação. Crie uma estrutura configurável.

10. Regras transversais

Todas as entidades relevantes devem possuir:

identificador UUID;
data de criação;
data de atualização;
usuário responsável pela criação;
status;
organização vinculada, quando aplicável.

Implemente exclusão lógica onde houver necessidade de histórico.

Entidades financeiras, reservas, avaliações, documentos e contratos não devem ser apagadas fisicamente.

Implemente:

RBAC;
escopo por organização;
auditoria;
validação server-side;
proteção contra acesso direto por URL;
logs de ações administrativas;
paginação;
busca;
filtros;
estados vazios;
loading;
tratamento de erro;
confirmações para ações destrutivas.

Nunca confie apenas em validações do frontend.

11. Integrações

Crie interfaces e adaptadores para integrações externas.

Integrações previstas:

Sympla;
gateway de pagamentos;
Mercado Pago;
S3 ou armazenamento compatível;
serviço de e-mail;
LMS SESI Startup;
BI e fontes de dados;
possível autenticação corporativa;
possível CRM ou ERP institucional.

Nesta primeira fase, utilize mocks ou implementações locais quando não houver credenciais.

Não invente endpoints, chaves ou formatos de API.

Cada integração deve possuir uma interface própria.

Exemplo:

interface EventTicketProvider {
  createExternalEvent(input: CreateExternalEventInput): Promise<ExternalEvent>;
  getPurchaseUrl(eventId: string): Promise<string>;
}
12. Estratégia de desenvolvimento

O sistema é grande. Não tente implementar todos os módulos ao mesmo tempo.

Fase 1 — Fundação e MVP técnico

Implemente:

estrutura do projeto;
banco PostgreSQL;
Prisma;
autenticação;
cadastro;
recuperação de senha;
aprovação de cadastro;
usuários;
organizações;
vínculos;
perfis;
permissões;
onboarding;
painel interno;
menu lateral;
proteção de rotas;
administração básica;
página inicial externa;
login;
estrutura visual dos módulos;
feature flags;
auditoria;
notificações básicas;
seed de desenvolvimento.

Os módulos complexos devem aparecer no menu, mas podem inicialmente exibir uma página informando que estão em preparação.

Fase 2 — Coworking e Eventos

Implementar:

salas;
disponibilidade;
reservas;
participantes;
check-in;
check-out;
cancelamento;
planos de coworking;
eventos;
aprovação;
integração abstrata com Sympla.
Fase 3 — Ideação

Implementar:

campanhas;
desafios;
equipes;
etapas;
documentos;
versões;
avaliadores;
notas;
feedback;
pontos;
badges;
galeria de produtos;
trocas.
Fase 4 — Gestão de Projetos

Implementar:

pré-análise;
níveis de maturidade;
planos de trabalho;
modelos;
checklists;
etapas;
responsáveis;
progresso;
serviços;
mentorias;
certificados.
Fase 5 — Tendências, relatórios e pagamentos

Implementar:

fontes de dados;
permissões;
dashboards;
criação de relatórios;
aprovação;
venda;
carrinho;
pagamento;
biblioteca de relatórios.
Fase 6 — Academy e integrações institucionais

Implementar ou integrar:

LMS;
conteúdos;
trilhas;
certificados;
CRM;
ERP;
SSO;
BI institucional.
13. Primeira execução obrigatória

Na primeira execução, não implemente diretamente todo o projeto.

Execute nesta ordem:

Leia todos os documentos e arquivos.
Analise as telas do Figma disponíveis.
Liste inconsistências, duplicidades e regras indefinidas.
Crie docs/analise-funcional.md.
Crie docs/arquitetura.md.
Crie docs/modelo-dados.md.
Crie docs/plano-implementacao.md.
Crie docs/matriz-permissoes.md.
Apresente a estrutura proposta antes de implementar regras complexas.
Em seguida, inicie apenas a Fase 1.

A análise deve diferenciar:

regra confirmada;
inferência;
decisão técnica;
pendência de negócio.
14. Banco de dados inicial

O banco inicial deve contemplar, pelo menos:

users;
accounts;
sessions;
verification_tokens;
organizations;
organization_types;
memberships;
roles;
permissions;
role_permissions;
membership_roles;
onboarding_profiles;
plans;
subscriptions;
module_features;
notifications;
audit_logs;
files.

Prepare os domínios futuros sem criar dezenas de tabelas vazias sem utilização.

As migrations devem ser versionadas.

Crie seed com:

um SUPER_ADMIN;
um ADM_HUB;
um ADM_ESPACO_INOVACAO;
um USUARIO_ESPACO_INOVACAO;
um ADM_STARTUP;
um USUARIO_EQUIPE_STARTUP;
um USUARIO_COMUM;
uma organização Hub;
um espaço de inovação;
uma startup;
planos de demonstração.

As credenciais de desenvolvimento devem aparecer apenas no README e nunca em produção.

15. Qualidade

Requisitos obrigatórios:

TypeScript strict;
ESLint;
Prettier;
commits e arquivos organizados;
sem secrets no código;
.env.example;
README atualizado;
migrations reproduzíveis;
testes de serviços;
testes de autorização;
testes dos principais fluxos;
tratamento de erros;
acessibilidade;
componentes reutilizáveis;
responsividade;
sem duplicação desnecessária.

Não use any sem justificativa.

Não crie grandes componentes com regras de negócio misturadas.

16. Segurança

Implemente:

hash seguro de senha;
proteção contra enumeração de usuários;
rate limiting em autenticação;
verificação de autorização no servidor;
validação de upload;
limite de tamanho de arquivo;
nomes seguros de arquivo;
URLs temporárias para arquivos privados;
controle de acesso por organização;
proteção contra IDOR;
auditoria de alterações administrativas;
sanitização de conteúdo editável.

Não exponha stack traces, tokens ou informações sensíveis para o usuário.

17. Entregáveis da Fase 1

Ao concluir a primeira fase, devem existir:

aplicação executando localmente;
banco em Docker;
migrations;
seed;
autenticação funcional;
cadastro funcional;
aprovação de cadastro;
onboarding funcional;
painel interno responsivo;
menu baseado em permissão;
gestão básica de usuários;
gestão básica de organizações;
gestão de membros;
perfis e permissões;
página pública inicial;
documentação técnica;
testes principais;
README com instruções completas.
18. Forma de trabalhar

Antes de alterar arquivos:

apresente o plano da alteração;
identifique arquivos afetados;
implemente em pequenas etapas;
execute lint, testes e build;
corrija os erros;
apresente um resumo do que foi alterado.

Não esconda erros.

Não marque uma funcionalidade como concluída sem validar:

build;
lint;
testes;
autorização;
responsividade básica.

Quando uma regra não estiver definida, registre-a em docs/pendencias-negocio.md em vez de inventar silenciosamente.