"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateMembershipRoleAction,
  suspendMembershipAction,
  reactivateMembershipAction,
  removeMembershipAction,
  type MembershipFormState,
} from "../actions/manage-membership";
import {
  createInvitationAction,
  type InvitationFormState,
} from "@/modules/invitations/actions/create-invitation";

const initialMembershipState: MembershipFormState = { status: "idle" };
const initialInvitationState: InvitationFormState = { status: "idle" };

export type MemberRow = {
  membershipId: string;
  name: string;
  email: string;
  roleCodes: string[];
  roleNames: string[];
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};

export type AssignableRole = { code: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
};

/**
 * Painel de gestão de membros + convites de uma organização (ativa ou, no
 * contexto administrativo, arbitrária). Modais de confirmação via
 * <dialog> nativo — nunca window.confirm.
 */
export function MembersPanel({
  organizationId,
  members,
  assignableRoles,
  canInvite,
}: {
  organizationId: string;
  members: MemberRow[];
  assignableRoles: AssignableRole[];
  canInvite: boolean;
}) {
  const [inviteState, inviteAction, inviting] = useActionState(
    createInvitationAction,
    initialInvitationState,
  );
  const [activeMembership, setActiveMembership] = useState<{
    id: string;
    mode: "role" | "suspend" | "reactivate" | "remove";
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [roleState, roleAction, roleUpdating] = useActionState(
    updateMembershipRoleAction,
    initialMembershipState,
  );
  const [suspendState, suspendAction, suspending] = useActionState(
    suspendMembershipAction,
    initialMembershipState,
  );
  const [reactivateState, reactivateAction, reactivating] = useActionState(
    reactivateMembershipAction,
    initialMembershipState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeMembershipAction,
    initialMembershipState,
  );

  const stateByMode: Record<string, MembershipFormState> = {
    role: roleState,
    suspend: suspendState,
    reactivate: reactivateState,
    remove: removeState,
  };
  const pending = roleUpdating || suspending || reactivating || removing;
  const activeState = activeMembership
    ? stateByMode[activeMembership.mode]
    : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const shouldBeOpen =
      !!activeMembership && activeState?.status !== "success";
    if (shouldBeOpen && !dialog.open) dialog.showModal();
    if (!shouldBeOpen && dialog.open) dialog.close();
  }, [activeMembership, activeState?.status]);

  const activeMember = members.find(
    (m) => m.membershipId === activeMembership?.id,
  );

  return (
    <div className="mt-6 space-y-6">
      {canInvite ? (
        <section className="rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">Convidar membro</h2>
          <form
            action={inviteAction}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="organizationId" value={organizationId} />
            <div className="flex-1 min-w-[220px]">
              <label
                htmlFor="invite-email"
                className="block text-sm font-medium"
              >
                E-mail
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="invite-role"
                className="block text-sm font-medium"
              >
                Papel
              </label>
              <select
                id="invite-role"
                name="roleCode"
                required
                className="mt-1 rounded-md border border-muted/40 px-3 py-2 text-sm"
              >
                {assignableRoles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
            >
              {inviting ? "Enviando…" : "Convidar"}
            </button>
          </form>
          {inviteState.status === "success" ? (
            <div
              role="status"
              className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
            >
              {inviteState.message}
              {inviteState.devInviteUrl ? (
                <p className="mt-1 break-all text-xs">
                  Link de desenvolvimento (não enviado por e-mail real):{" "}
                  <a href={inviteState.devInviteUrl} className="underline">
                    {inviteState.devInviteUrl}
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}
          {inviteState.status === "error" ? (
            <p
              role="alert"
              className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {inviteState.message}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="hidden w-full text-left text-sm sm:table">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Nome
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Papéis
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Entrada
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.membershipId}
                className="border-b border-muted/10 last:border-0"
              >
                <td className="px-4 py-3">{m.name}</td>
                <td className="px-4 py-3 text-muted">{m.email}</td>
                <td className="px-4 py-3">
                  {m.roleNames.join(", ") || "Sem papel"}
                </td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[m.status] ?? m.status}
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    member={m}
                    canManage={canInvite}
                    onOpen={(mode) =>
                      setActiveMembership({ id: m.membershipId, mode })
                    }
                  />
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhum membro encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Cards para telas pequenas */}
        <ul className="divide-y divide-muted/10 sm:hidden">
          {members.map((m) => (
            <li key={m.membershipId} className="p-4">
              <p className="font-semibold text-primary">{m.name}</p>
              <p className="text-sm text-muted">{m.email}</p>
              <p className="mt-1 text-sm">
                {m.roleNames.join(", ") || "Sem papel"}
              </p>
              <p className="text-xs text-muted">
                {STATUS_LABEL[m.status] ?? m.status}
              </p>
              <div className="mt-3">
                <RowActions
                  member={m}
                  canManage={canInvite}
                  onOpen={(mode) =>
                    setActiveMembership({ id: m.membershipId, mode })
                  }
                />
              </div>
            </li>
          ))}
          {members.length === 0 ? (
            <li className="p-6 text-center text-muted">
              Nenhum membro encontrado.
            </li>
          ) : null}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setActiveMembership(null)}
        aria-label="Confirmar ação sobre o membro"
        className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        {activeMembership && activeMember ? (
          <div className="p-6">
            {activeState?.status === "error" ? (
              <p
                role="alert"
                className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {activeState.message}
              </p>
            ) : null}

            {activeMembership.mode === "role" ? (
              <form action={roleAction}>
                <h2 className="text-lg font-bold text-primary">
                  Alterar papel
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Alterando o papel de {activeMember.name}.
                </p>
                <input
                  type="hidden"
                  name="membershipId"
                  value={activeMembership.id}
                />
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <label
                  htmlFor="roleCode"
                  className="mt-4 block text-sm font-medium"
                >
                  Novo papel
                </label>
                <select
                  id="roleCode"
                  name="roleCode"
                  required
                  className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <DialogActions
                  pending={pending}
                  onCancel={() => setActiveMembership(null)}
                  label="Confirmar troca"
                />
              </form>
            ) : null}

            {activeMembership.mode === "suspend" ? (
              <form action={suspendAction}>
                <h2 className="text-lg font-bold text-primary">
                  Suspender membro
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {activeMember.name} perderá acesso à organização até ser
                  reativado(a).
                </p>
                <input
                  type="hidden"
                  name="membershipId"
                  value={activeMembership.id}
                />
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <DialogActions
                  pending={pending}
                  onCancel={() => setActiveMembership(null)}
                  label="Confirmar suspensão"
                  danger
                />
              </form>
            ) : null}

            {activeMembership.mode === "reactivate" ? (
              <form action={reactivateAction}>
                <h2 className="text-lg font-bold text-primary">
                  Reativar membro
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {activeMember.name} voltará a ter acesso à organização.
                </p>
                <input
                  type="hidden"
                  name="membershipId"
                  value={activeMembership.id}
                />
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <DialogActions
                  pending={pending}
                  onCancel={() => setActiveMembership(null)}
                  label="Confirmar reativação"
                />
              </form>
            ) : null}

            {activeMembership.mode === "remove" ? (
              <form action={removeAction}>
                <h2 className="text-lg font-bold text-primary">
                  Remover membro
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {activeMember.name} será desvinculado(a) da organização
                  (remoção lógica).
                </p>
                <input
                  type="hidden"
                  name="membershipId"
                  value={activeMembership.id}
                />
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <DialogActions
                  pending={pending}
                  onCancel={() => setActiveMembership(null)}
                  label="Confirmar remoção"
                  danger
                />
              </form>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

function RowActions({
  member,
  canManage,
  onOpen,
}: {
  member: MemberRow;
  canManage: boolean;
  onOpen: (mode: "role" | "suspend" | "reactivate" | "remove") => void;
}) {
  if (!canManage) return <span className="text-xs text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onOpen("role")}
        className="rounded border border-muted/40 px-2 py-1 text-xs hover:bg-muted/10"
      >
        Trocar papel
      </button>
      {member.status === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => onOpen("suspend")}
          className="rounded border border-warning/40 px-2 py-1 text-xs text-warning hover:bg-warning/10"
        >
          Suspender
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onOpen("reactivate")}
          className="rounded border border-success/40 px-2 py-1 text-xs text-success hover:bg-success/10"
        >
          Reativar
        </button>
      )}
      <button
        type="button"
        onClick={() => onOpen("remove")}
        className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
      >
        Remover
      </button>
    </div>
  );
}

function DialogActions({
  pending,
  onCancel,
  label,
  danger,
}: {
  pending: boolean;
  onCancel: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-muted/40 px-4 py-2 text-sm"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
          danger
            ? "bg-danger text-white hover:opacity-90"
            : "bg-accent text-foreground-inverse hover:bg-accent-hover"
        }`}
      >
        {pending ? "Enviando…" : label}
      </button>
    </div>
  );
}
