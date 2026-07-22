import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireGlobalPermission, hasGlobalPermission } from "@/lib/authz";
import { getUserDetail } from "@/modules/users/services/get-user-detail";
import { isUserSuperAdmin } from "@/modules/users/services/super-admin-guards";
import { prisma } from "@/lib/prisma";
import { UserAdminPanel } from "@/modules/users/components/user-admin-panel";

export const metadata: Metadata = { title: "Usuário" };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  PENDING: "Pendente",
  DEACTIVATED: "Desativado",
};

export default async function AdminUsuarioDetalhePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  // ID malformado → 404 genérico, sem revelar existência (anti-IDOR).
  if (!z.uuid().safeParse(userId).success) notFound();

  const ctx = await requireGlobalPermission("users.view");
  const detail = await getUserDetail(userId);
  if (!detail) notFound();

  const { user, auditLogs } = detail;

  // Só SUPER_ADMIN administra outro SUPER_ADMIN — a UI reflete a mesma regra
  // que o serviço aplica no servidor.
  const targetIsSuperAdmin = await isUserSuperAdmin(prisma, user.id);
  const canAdminister = ctx.access.superAdmin || !targetIsSuperAdmin;
  const isSelf = ctx.user.id === user.id;

  const canUpdate =
    canAdminister && (await hasGlobalPermission("users.update"));
  const canSuspend =
    canAdminister && !isSelf && (await hasGlobalPermission("users.suspend"));
  const canReactivate =
    canAdminister && (await hasGlobalPermission("users.reactivate"));

  return (
    <>
      <Link
        href="/app/admin/usuarios"
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar para usuários
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-primary">{user.name}</h1>
        <span className="rounded bg-muted/10 px-2 py-0.5 text-xs font-medium text-muted">
          {STATUS_LABEL[user.status] ?? user.status}
        </span>
        {targetIsSuperAdmin ? (
          <span className="rounded bg-secondary/30 px-2 py-0.5 text-xs font-medium text-primary-dark">
            Super administrador
          </span>
        ) : null}
      </div>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted">E-mail</dt>
            <dd className="mt-1">{user.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">E-mail verificado</dt>
            <dd className="mt-1">
              {user.emailVerified
                ? user.emailVerified.toLocaleDateString("pt-BR")
                : "Não verificado"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Criado em</dt>
            <dd className="mt-1">
              {user.createdAt.toLocaleDateString("pt-BR")}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Onboarding</dt>
            <dd className="mt-1">
              {user.onboarding
                ? `${user.onboarding.status}${
                    user.onboarding.selectedStage
                      ? ` — ${user.onboarding.selectedStage}`
                      : ""
                  }`
                : "Não iniciado"}
            </dd>
          </div>
          {user.status === "SUSPENDED" ? (
            <div className="sm:col-span-2 rounded-md bg-danger/10 p-3">
              <dt className="font-medium text-danger">Suspensão</dt>
              <dd className="mt-1 text-sm">
                {user.suspensionReason ?? "Sem motivo registrado."}
                {user.suspendedAt ? (
                  <span className="text-muted">
                    {" "}
                    — em {user.suspendedAt.toLocaleString("pt-BR")}
                    {user.suspendedBy ? ` por ${user.suspendedBy.name}` : ""}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Vínculos e papéis</h2>
        <p className="mt-1 text-xs text-muted">
          Papéis e organizações são alterados na gestão de membros da
          organização, não por esta tela.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {user.memberships.map((m) => (
            <li key={m.id} className="flex flex-wrap gap-2">
              <span className="font-medium text-primary">
                {m.organization.name}
              </span>
              <span className="text-muted">({m.organization.type.name})</span>
              <span className="text-muted">
                — {m.roles.map((r) => r.role.name).join(", ") || "Sem papel"}
              </span>
              <span className="text-xs text-muted">· {m.status}</span>
            </li>
          ))}
          {user.memberships.length === 0 ? (
            <li className="text-muted">Nenhum vínculo.</li>
          ) : null}
        </ul>
      </section>

      {user.registrationRequests.length > 0 ? (
        <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">
            Solicitações institucionais
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {user.registrationRequests.map((r) => (
              <li key={r.id}>
                {r.createdAt.toLocaleDateString("pt-BR")} — {r.type} —{" "}
                {r.status}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {user.notifications.length > 0 ? (
        <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">Notificações recentes</h2>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {user.notifications.map((n) => (
              <li key={n.id}>
                {n.createdAt.toLocaleDateString("pt-BR")} — {n.title}
                {n.readAt ? "" : " (não lida)"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-xl bg-surface p-6 shadow-sm">
        <h2 className="font-semibold text-primary">Auditoria relacionada</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {auditLogs.map((log) => (
            <li key={log.id}>
              {log.createdAt.toLocaleString("pt-BR")} —{" "}
              {log.actor?.name ?? "Sistema"} — {log.action}
              {log.organization ? ` (${log.organization.name})` : ""}
            </li>
          ))}
          {auditLogs.length === 0 ? <li>Nenhum evento registrado.</li> : null}
        </ul>
      </section>

      {isSelf ? (
        <p className="mt-6 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          Esta é a sua própria conta: a suspensão está indisponível.
        </p>
      ) : null}
      {!canAdminister ? (
        <p className="mt-6 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          Apenas um super administrador pode administrar esta conta.
        </p>
      ) : null}

      <UserAdminPanel
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.status,
          updatedAt: user.updatedAt.toISOString(),
        }}
        canUpdate={canUpdate}
        canSuspend={canSuspend}
        canReactivate={canReactivate}
      />
    </>
  );
}
