import Image from "next/image";
import Link from "next/link";
import { Menu, UserRound } from "lucide-react";

// Layout fiel ao modelo oficial (public/references/figma/landing-model.png).
// Textos institucionais provisórios — o modelo usa lorem ipsum; aqui entra a
// redação real já validada (ver docs/pendencias-negocio.md).

// Itens de menu do modelo. EVENTOS/DESAFIOS/CONTEÚDOS são módulos futuros
// (feature flags desligadas) — apontam para âncoras da própria página até os
// módulos existirem (registrado em docs/pendencias-negocio.md).
const NAV_ITEMS = [
  { label: "HUB", href: "#inicio" },
  { label: "EVENTOS", href: "#ecossistema" },
  { label: "DESAFIOS", href: "#ecossistema" },
  { label: "ACELERAÇÃO", href: "#aceleracao" },
  { label: "CONTEÚDOS", href: "#faca-parte" },
];

const pillars = [
  {
    title: "Startups e empresas",
    description:
      "Cadastre a sua startup, monte a sua equipe e acompanhe a evolução do seu negócio dentro do ecossistema.",
  },
  {
    title: "Espaços de inovação",
    description:
      "Conecte-se aos espaços de inovação, reserve ambientes de coworking e participe da comunidade.",
  },
  {
    title: "Aceleração e mentorias",
    description:
      "Programas de aceleração, mentorias especializadas e desafios de inovação para todos os estágios.",
  },
];

/** Linha divisória do modelo: régua fina com pontos nas extremidades. */
function SectionDivider({ light = false }: { light?: boolean }) {
  const color = light ? "bg-white/60" : "bg-primary/30";
  const line = light ? "border-white/40" : "border-primary/20";
  return (
    <div aria-hidden className="mx-auto flex max-w-5xl items-center px-4">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className={`h-px flex-1 border-t ${line}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero com cabeçalho TRANSPARENTE sobre o gradiente navy→lima (fiel ao
          modelo: o header não é uma barra sólida — a foto/gradiente do hero
          passa por trás dele). */}
      <section
        id="inicio"
        className="relative isolate overflow-hidden bg-primary-dark"
      >
        <Image
          src="/images/hero-team.webp"
          alt=""
          fill
          className="object-cover object-right-top"
          priority
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary-dark/55 to-primary-dark/5"
        />
        <div className="relative z-10 mx-auto max-w-6xl px-4">
          <header className="flex items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-3">
              {/* Menu recolhido em telas menores (o modelo mostra o ícone à
                  esquerda do logo). Usa <details> nativo — sem JS de cliente. */}
              <details className="relative lg:hidden">
                <summary className="flex cursor-pointer list-none items-center rounded-md p-1.5 text-white/90 hover:bg-white/10">
                  <Menu aria-hidden className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </summary>
                <nav
                  aria-label="Navegação principal"
                  className="absolute left-0 top-full z-30 mt-2 flex w-56 flex-col gap-1 rounded-lg bg-primary-dark p-3 shadow-xl"
                >
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider text-white/85 hover:bg-white/10 hover:text-secondary"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </details>
              <Link href="/" aria-label="Página inicial do Hub Digital">
                <Image
                  src="/brand/logo-horizontal-white.png"
                  alt="Startup Hub"
                  width={170}
                  height={47}
                  priority
                />
              </Link>
            </div>
            <nav
              aria-label="Navegação principal"
              className="hidden items-center gap-8 lg:flex"
            >
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium uppercase tracking-widest text-white/85 transition hover:text-secondary"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground-inverse shadow-md transition hover:bg-accent-hover"
            >
              <UserRound aria-hidden className="h-4 w-4" />
              Login
            </Link>
          </header>
          {/* Linha laranja fina sob o logo — detalhe do modelo. */}
          <div aria-hidden className="h-0.5 w-40 rounded-full bg-accent" />

          <div className="pb-24 pt-14 text-foreground-inverse md:pb-40 md:pt-20">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-secondary/90 p-3">
              <Image
                src="/brand/symbol-white.png"
                alt=""
                width={40}
                height={36}
              />
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight md:text-6xl">
              Startup HUB
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/90">
              Startups, espaços de inovação, mentores e empresas conectados em
              uma única plataforma: eventos, coworking, desafios de inovação e
              programas de aceleração.
            </p>
            <div className="mt-10">
              <Link
                href="/cadastro"
                className="inline-block rounded-lg bg-accent px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground-inverse shadow-lg transition hover:bg-accent-hover"
              >
                Conheça nossa plataforma
              </Link>
            </div>
            <div className="mt-20 md:mt-28">
              <SectionDivider light />
            </div>
          </div>
        </div>
      </section>

      {/* Serviços / Planos de aceleração — seção clara com foto e cards flutuantes. */}
      <section
        id="aceleracao"
        className="relative isolate overflow-hidden bg-background"
      >
        <Image
          src="/images/network-pattern.webp"
          alt=""
          width={780}
          height={747}
          aria-hidden
          className="pointer-events-none absolute -right-24 top-10 -z-10 opacity-70"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-sm font-bold text-accent">Serviços</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-primary md:text-5xl">
              Planos de aceleração
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-foreground/80">
              Da ideia à startup consolidada: onboarding guiado, classificação
              de maturidade e planos de trabalho acompanhados por especialistas
              do ecossistema.
            </p>
            <Link
              href="/cadastro"
              className="mt-10 inline-block rounded-lg bg-accent px-8 py-4 text-sm font-bold uppercase tracking-wider text-foreground-inverse shadow-lg transition hover:bg-accent-hover"
            >
              Escolha seu plano aqui
            </Link>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <Image
              src="/images/acceleration-woman.webp"
              alt="Empreendedora utilizando a plataforma do Hub Digital"
              width={1050}
              height={723}
              className="h-auto w-full"
            />
            <div className="absolute -top-6 right-0 w-44 rounded-xl bg-surface p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="rounded bg-primary-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
                  5.0
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                  Recomendações
                </span>
              </div>
              <p className="mt-2 text-xs font-medium leading-snug text-primary">
                Sistema de recomendação personalizada de conteúdo
              </p>
            </div>
            <div className="absolute -left-4 bottom-10 w-40 rounded-xl bg-surface p-3 shadow-lg">
              <div className="flex items-center justify-end">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                  Interações
                </span>
              </div>
              <p className="mt-2 text-xs font-medium leading-snug text-primary">
                Aprendizagem colaborativa
              </p>
            </div>
          </div>
        </div>
        <div className="pb-16">
          <SectionDivider />
        </div>
      </section>

      {/* Pilares do ecossistema — mesma linguagem visual do modelo. */}
      <section id="ecossistema" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-3xl font-semibold text-primary md:text-4xl">
            Tudo o que o seu negócio precisa para evoluir
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <article
                key={p.title}
                className="rounded-xl bg-surface p-6 shadow-md"
              >
                <h3 className="text-lg font-semibold text-primary">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {p.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Entrada no ecossistema — CTAs funcionais de solicitação de cadastro. */}
      <section id="faca-parte" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-24">
          <SectionDivider />
          <h2 className="mt-16 text-3xl font-semibold text-primary md:text-4xl">
            Faça parte do ecossistema
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Envie uma solicitação para ingressar no Hub Digital. Após o envio, a
            equipe analisa o pedido antes da aprovação.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="flex flex-col rounded-xl bg-surface p-6 shadow-md">
              <h3 className="text-lg font-semibold text-primary">
                Sou uma startup
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted">
                Cadastre a sua startup para participar dos programas e da
                comunidade do Hub.
              </p>
              <Link
                href="/cadastro/startup"
                className="mt-5 inline-block rounded-lg bg-accent px-6 py-3 text-center text-sm font-bold uppercase tracking-wider text-foreground-inverse shadow-md transition hover:bg-accent-hover"
              >
                Solicitar cadastro de startup
              </Link>
            </article>
            <article className="flex flex-col rounded-xl bg-surface p-6 shadow-md">
              <h3 className="text-lg font-semibold text-primary">
                Represento um espaço de inovação
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted">
                Cadastre o seu espaço de inovação e conecte-se ao ecossistema.
              </p>
              <Link
                href="/cadastro/espaco-inovacao"
                className="mt-5 inline-block rounded-lg border-2 border-primary px-6 py-3 text-center text-sm font-bold uppercase tracking-wider text-primary transition hover:bg-primary/5"
              >
                Solicitar cadastro de espaço
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* Rodapé — gradiente lima→navy com logo empilhada, colunas e newsletter. */}
      <footer className="relative isolate overflow-hidden bg-gradient-to-r from-[#5d7a1f] via-primary to-primary-dark">
        <Image
          src="/images/network-pattern.webp"
          alt=""
          width={640}
          height={613}
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 -z-10 opacity-30"
        />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 text-sm text-white/85 md:grid-cols-[auto_1px_1fr_auto] md:items-center">
          <Image
            src="/brand/logo-stacked-white.png"
            alt="Startup Hub"
            width={110}
            height={110}
            className="h-auto"
          />
          <div
            aria-hidden
            className="hidden h-full w-px bg-white/30 md:block"
          />
          <nav
            aria-label="Links do rodapé"
            className="grid grid-cols-2 gap-x-10 gap-y-3"
          >
            <Link href="/login" className="hover:text-white">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-white">
              Cadastre-se
            </Link>
            <Link href="/recuperar-senha" className="hover:text-white">
              Recuperar senha
            </Link>
            <Link href="/cadastro/startup" className="hover:text-white">
              Cadastro de startup
            </Link>
            <Link href="/termos" className="hover:text-white">
              Termos de uso
            </Link>
            <Link href="/politica-privacidade" className="hover:text-white">
              Termos LGPD
            </Link>
          </nav>
          <div className="max-w-xs">
            <p className="font-bold text-white">
              Inscreva-se na nossa Newsletter
            </p>
            {/* Envio real de newsletter ainda não implementado — campo
                presente conforme o modelo, com envio desabilitado. */}
            <form className="mt-3" aria-describedby="newsletter-hint">
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Seu e-mail"
                disabled
                className="w-full rounded-full bg-white px-5 py-3 text-sm text-primary-dark placeholder:text-muted disabled:opacity-90"
              />
              <p id="newsletter-hint" className="mt-2 text-xs text-white/60">
                Em breve — inscrição ainda não disponível.
              </p>
            </form>
          </div>
        </div>
        <div className="border-t border-white/15">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/60">
            © {new Date().getFullYear()} Hub Digital.
          </p>
        </div>
      </footer>
    </div>
  );
}
