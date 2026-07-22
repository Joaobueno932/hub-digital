# Design system — Hub Digital

Referência principal de identidade: landing page colorida do Figma (arquivo "Protótipo Hub Digital"). As telas em escala de cinza dos ambientes interno/externo são wireframes de fluxo, não identidade — devem receber a paleta oficial.

Nota da auditoria: o Figma MCP não estava autenticado; esta versão baseia-se em `docs/design/brand-guide.md`, `docs/design/tokens.*`, `public/assets.json` e nos exports em `public/references/figma/`. Revisar componentes contra o Figma quando o conector for autorizado.

## Cores e tokens semânticos

Fonte: `public/assets.json` e `docs/design/tokens.json`.

| Token semântico              | Valor     | Uso                                                 |
| ---------------------------- | --------- | --------------------------------------------------- |
| `--color-primary`            | `#182F4F` | Cor institucional, cabeçalhos, superfícies de marca |
| `--color-primary-dark`       | `#0C1B2A` | Fundo escuro, rodapé, hero                          |
| `--color-secondary`          | `#BCCE2D` | Destaques secundários, badges, detalhes gráficos    |
| `--color-accent`             | `#E85D04` | Botões primários, CTAs, links de ação               |
| `--color-background`         | `#EAEAEA` | Fundo neutro claro                                  |
| `--color-surface`            | `#FFFFFF` | Cartões, modais, campos                             |
| `--color-foreground`         | `#0C1B2A` | Texto sobre fundo claro                             |
| `--color-foreground-inverse` | `#FFFFFF` | Texto sobre fundo escuro                            |

Derivados (propostos, gerar com escala): estados hover/active do accent (`#C94F03` aprox.), feedback `success`/`warning`/`danger`/`info` — pendente de validação visual; não usar hex solto em componentes, sempre via token (CSS vars mapeadas no Tailwind).

## Tipografia

Observada no material: Nexa, Lexend, Gotham, Montserrat. Nexa e Gotham são comerciais e **não têm licenciamento confirmado** (pendência). Alternativa adotada no MVP: **Lexend** (Google Fonts, aberta) para display/títulos e corpo, com fallback `system-ui`. Montserrat como alternativa secundária se o Figma exigir maior fidelidade.

Escala proposta: 12/14/16/18/20/24/30/36/48; peso 400/500/600/700; line-height 1.5 corpo, 1.2 títulos.

## Logos e assets

Caminhos oficiais em `public/assets.json` (não renomear — PNGs provisórios serão trocados por SVG):

- Logos: `/brand/logo-horizontal-{white,dark}.png`, `/brand/logo-stacked-{white,dark}.png`
- Símbolo: `/brand/symbol-{white,dark}.png`; wordmark: `/brand/wordmark-{white,dark}.png`
- Padrões gráficos: `/brand/pattern-secondary.png`, `/brand/pattern-white.png`
- Imagens: `/images/hero-background.webp`, `/images/acceleration-visual.webp`, `/images/footer-background.webp`
- Favicons/webmanifest em `/brand/*` e raiz; OG: `/og-image.png`
- Referências (não usar em produção): `/references/figma/*`

Regras: não gerar logos artificiais; usar logo claro sobre `primary-dark` e escuro sobre fundos claros.

## Componentes base (shadcn/ui + Radix, tema com tokens)

- **Botões**: primário (accent, texto branco), secundário (outline primary), ghost, destructive; estados hover/focus/disabled/loading; foco visível (`outline` 2px accent sobre claro, secondary sobre escuro).
- **Links**: accent com sublinhado no hover; links de navegação em primary/branco.
- **Campos, seletores, checkboxes, radios**: superfícies brancas, borda neutra, foco accent, erro danger com mensagem abaixo; labels sempre visíveis (sem placeholder-como-label).
- **Cartões**: superfície branca, raio 8–12px, sombra suave.
- **Tabelas**: cabeçalho neutro, zebra opcional, paginação, estados vazio/carregando; rolagem horizontal própria no mobile.
- **Badges**: status (pendente = warning, aprovado = success, reprovado = danger, ativo = secondary).
- **Alertas/toasts**: info/success/warning/danger com ícone e role adequado (`status`/`alert`).
- **Modais**: Radix Dialog, foco preso, fechamento por ESC; confirmação obrigatória para ações destrutivas.
- **Skeletons/loading**: skeleton em listas e cards; spinner em botões.
- **Estados vazios**: ícone + título + descrição + ação primária quando aplicável.
- **Mensagens de erro**: linguagem clara em português, sem stack trace, com ação de recuperação.

## Onboarding (Etapa 1.6)

- Seleção dos 5 estágios como **radiogroup acessível**: `fieldset`/`legend`, `input[type=radio]` nativos com `aria-label` (título) + `aria-describedby` (descrição), foco visível, operável 100% por teclado. O estado selecionado é indicado por **marcador + borda + anel + ícone destacado** (não apenas cor).
- Cada opção: título, descrição curta, área clicável ampla (label envolve o cartão).
- Botões: "Continuar", "Salvar e continuar depois" (desabilitados sem seleção), "Voltar", "Finalizar". Finalização com **confirmação em `<dialog>` nativo** (foco preso, ESC), nunca `window.confirm`.
- Mensagens de sucesso (`role=status`) e erro (`role=alert`); estados de loading nos botões.

## Solicitações institucionais (Etapa 1.7)

- Formulários (`/cadastro/startup`, `/cadastro/espaco-inovacao`) com React Hook Form: campos com `label` associado, asterisco de obrigatório com `aria-hidden`, `aria-invalid`/`aria-describedby` nos erros, foco no primeiro inválido (RHF), preservação dos dados após erro, estado de loading no botão.
- **Honeypot** (`companyWebsite`) em contêiner fora da tela (`left:-9999px`), com `tabindex=-1` e rótulo — invisível para humanos, presente para bots.
- Consentimentos em `fieldset`/`legend` com links para `/termos` e `/politica-privacidade`. Estados: erro (alert), conflito (mensagem segura sobre solicitação existente), sucesso (`/cadastro/enviado`). "Minhas solicitações" com tabela responsiva (scroll-x), badges de status e estado vazio.

## Organizações, membros e convites (Etapa 1.8)

- Listagens (`/app/admin/organizacoes`, `/app/membros`) com tabela responsiva (scroll-x) em telas médias/grandes e **cards** em telas pequenas (mesmo dado, marcação diferente — não apenas CSS de ocultar coluna); busca/filtros via `<form method="get">` (sem JS obrigatório), paginação por link.
- Toda ação destrutiva ou de estado (trocar papel, suspender/reativar/remover membro, suspender/reativar organização, revogar convite) usa **confirmação em `<dialog>` nativo** (foco preso, fechável por ESC), nunca `window.confirm` — mesmo padrão de `DecisionPanel` (Etapa 1.5) e da finalização do onboarding (Etapa 1.6).
- Mensagens de sucesso (`role=status`) e erro (`role=alert`) dentro do próprio diálogo/formulário; botões com estado de carregamento (`useActionState`).
- Link de convite (recurso de desenvolvimento, sem envio real de e-mail) exibido como texto selecionável com rótulo explícito de que é temporário — nunca copiado automaticamente para a área de transferência sem ação do usuário.

## Padrões de layout

- **Cabeçalho público**: logo horizontal, navegação principal (Quem somos, Startups, Serviços, Eventos, Planos, Vagas — rotas do CLAUDE.md), CTA "Entrar"/"Cadastre-se" em accent; colapsa em menu hambúrguer < 1024px.
- **Rodapé**: fundo `primary-dark` com `footer-background.webp`/pattern, logo branco, colunas de links, contatos.
- **Menu lateral interno**: fundo primary-dark, itens por permissão/flag, ícones + rótulo, item ativo com barra accent; colapsável; em mobile vira drawer + barra superior.
- **Navegação mobile**: drawer acessível (Radix), alvo de toque ≥ 44px.

## Breakpoints e responsividade

Tailwind padrão: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. Layout fluido, grid/flex; nada de larguras fixas do Figma. Conteúdo largo (tabelas) com `overflow-x-auto`.

## Acessibilidade

- Contraste AA mínimo: atenção — `#BCCE2D` e `#E85D04` **não** atingem AA sobre branco em texto pequeno; usar accent apenas em botões com texto branco (relação ~4.6:1 com white é limítrofe — validar; alternativa: texto branco sobre accent apenas ≥ 18px/bold, ou escurecer o accent em texto). Secondary nunca como cor de texto sobre claro.
- Foco de teclado visível em todos os interativos; navegação completa por teclado; landmarks semânticos (`header/nav/main/footer`); `alt` em imagens; formulários com `label` e `aria-describedby` para erros.
