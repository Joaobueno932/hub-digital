import Image from "next/image";
import Link from "next/link";

// Textos institucionais provisórios — conteúdo editável, aguardando redação
// oficial (ver docs/pendencias-negocio.md).

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="Página inicial do Hub Digital">
            <Image
              src="/brand/logo-horizontal-white.png"
              alt="Hub Digital"
              width={180}
              height={48}
              priority
            />
          </Link>
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-6 md:flex"
          >
            <Link
              href="/login"
              className="text-sm text-foreground-inverse hover:text-secondary"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover"
            >
              Cadastre-se
            </Link>
          </nav>
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse md:hidden"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-primary-dark">
        <Image
          src="/images/hero-background.webp"
          alt=""
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-foreground-inverse">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            O ponto de encontro do ecossistema de inovação
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            Startups, espaços de inovação, mentores e empresas conectados em uma
            única plataforma: eventos, coworking, desafios de inovação e
            programas de aceleração.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/cadastro"
              className="rounded-md bg-accent px-6 py-3 font-semibold text-foreground-inverse hover:bg-accent-hover"
            >
              Comece agora
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/40 px-6 py-3 font-semibold text-foreground-inverse hover:bg-white/10"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">
          Tudo o que o seu negócio precisa para evoluir
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.title}
              className="rounded-xl bg-surface p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {p.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-primary">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2">
          <div className="text-foreground-inverse">
            <h2 className="text-2xl font-bold md:text-3xl">
              Programas de aceleração
            </h2>
            <p className="mt-4 text-white/80">
              Da ideia à startup consolidada: onboarding guiado, classificação
              de maturidade e planos de trabalho acompanhados por especialistas
              do ecossistema.
            </p>
            <Link
              href="/cadastro"
              className="mt-8 inline-block rounded-md bg-secondary px-6 py-3 font-semibold text-primary-dark hover:opacity-90"
            >
              Quero acelerar minha startup
            </Link>
          </div>
          <Image
            src="/images/acceleration-visual.webp"
            alt="Ilustração do programa de aceleração do Hub Digital"
            width={560}
            height={400}
            className="h-auto w-full rounded-xl"
          />
        </div>
      </section>

      <footer className="relative isolate overflow-hidden bg-primary-dark">
        <Image
          src="/images/footer-background.webp"
          alt=""
          fill
          className="object-cover opacity-30"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-12 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <Image
            src="/brand/logo-stacked-white.png"
            alt="Hub Digital"
            width={120}
            height={80}
          />
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-6">
            <Link href="/login" className="hover:text-white">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-white">
              Cadastre-se
            </Link>
            <Link href="/recuperar-senha" className="hover:text-white">
              Recuperar senha
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} Hub Digital.</p>
        </div>
      </footer>
    </div>
  );
}
