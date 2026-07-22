import type { Metadata } from "next";
import Link from "next/link";
import { requireSessionContext } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  getOnboardingProfile,
  onboardingStateOf,
} from "@/modules/onboarding/services/get-onboarding-profile";
import { getStageOption } from "@/modules/onboarding/config/stages";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const ctx = await requireSessionContext();

  const [notifications, onboardingProfile] = await Promise.all([
    prisma.notification.findMany({
      // Sempre escopado ao usuário autenticado — nunca a IDs vindos do cliente.
      where: { userId: ctx.user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getOnboardingProfile(ctx.user.id),
  ]);

  const onboardingState = onboardingStateOf(onboardingProfile);
  const stage = onboardingProfile?.selectedStage
    ? getStageOption(onboardingProfile.selectedStage)
    : undefined;

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Olá, {ctx.user.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {ctx.activeMembership
          ? `Você está atuando em ${ctx.activeMembership.organization.name}.`
          : "Você ainda não possui vínculo com uma organização."}
      </p>

      <section
        aria-label="Seu perfil inicial"
        className="mt-6 rounded-xl bg-surface p-6 shadow-sm"
      >
        <h2 className="font-semibold text-primary">Seu perfil inicial</h2>
        {onboardingState === "NOT_STARTED" ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Você ainda não informou o seu estágio. Leva menos de um minuto.
            </p>
            <Link
              href="/app/onboarding"
              className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover"
            >
              Iniciar onboarding
            </Link>
          </>
        ) : null}
        {onboardingState === "DRAFT" ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Você começou o onboarding e o seu progresso está salvo. Continue
              de onde parou.
            </p>
            <Link
              href="/app/onboarding"
              className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover"
            >
              Continuar onboarding
            </Link>
          </>
        ) : null}
        {onboardingState === "COMPLETED" ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Estágio informado:{" "}
              <span className="font-semibold text-primary">
                {stage?.title ?? "—"}
              </span>
            </p>
            <Link
              href="/app/onboarding/concluido"
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              Consultar resultado
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">Seus vínculos</h2>
          {ctx.access.memberships.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nenhum vínculo ativo. Complete o onboarding ou aguarde a aprovação
              da sua solicitação.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {ctx.access.memberships.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{m.organization.name}</span>
                  <span className="rounded bg-secondary/30 px-2 py-0.5 text-xs text-primary">
                    {m.roles.map((r) => r.role.name).join(", ") || "Sem papel"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">Notificações</h2>
          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma notificação nova.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {notifications.map((n) => (
                <li key={n.id}>
                  <p className="font-medium">{n.title}</p>
                  {n.body ? <p className="text-muted">{n.body}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Módulos em preparação</h2>
        <p className="mt-2 text-sm text-muted">
          Coworking, Eventos, Ideação, Gestão de Projetos, Tendências e Negócios
          e Academy serão liberados nas próximas fases e aparecerão no menu
          quando habilitados.
        </p>
        <Link
          href="/app/configuracoes"
          className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          Configurações da conta
        </Link>
      </section>
    </>
  );
}
