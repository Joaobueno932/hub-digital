"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  revokeInvitationAction,
  type InvitationFormState,
} from "../actions/revoke-invitation";

const initialState: InvitationFormState = { status: "idle" };

export type InvitationRow = {
  id: string;
  email: string;
  roleName: string;
  status: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceito",
  DECLINED: "Recusado",
  REVOKED: "Revogado",
  EXPIRED: "Expirado",
};

export function InvitationsPanel({
  invitations,
}: {
  invitations: InvitationRow[];
}) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(
    revokeInvitationAction,
    initialState,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const shouldBeOpen = !!revoking && state.status !== "success";
    if (shouldBeOpen && !dialog.open) dialog.showModal();
    if (!shouldBeOpen && dialog.open) dialog.close();
  }, [revoking, state.status]);

  return (
    <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-muted/20 text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              E-mail
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Papel
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Enviado por
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Expira em
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id} className="border-b border-muted/10 last:border-0">
              <td className="px-4 py-3">{inv.email}</td>
              <td className="px-4 py-3">{inv.roleName}</td>
              <td className="px-4 py-3">
                {STATUS_LABEL[inv.status] ?? inv.status}
              </td>
              <td className="px-4 py-3 text-muted">{inv.invitedByName}</td>
              <td className="px-4 py-3 text-muted">
                {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3">
                {inv.status === "PENDING" ? (
                  <button
                    type="button"
                    onClick={() => setRevoking(inv.id)}
                    className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    Revogar
                  </button>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
          {invitations.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-muted">
                Nenhum convite enviado ainda.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <dialog
        ref={dialogRef}
        onClose={() => setRevoking(null)}
        aria-label="Confirmar revogação do convite"
        className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        {revoking ? (
          <form action={action} className="p-6">
            <h2 className="text-lg font-bold text-primary">Revogar convite</h2>
            <p className="mt-2 text-sm text-muted">
              O link deixará de funcionar imediatamente.
            </p>
            <input type="hidden" name="invitationId" value={revoking} />
            {state.status === "error" ? (
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {state.message}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevoking(null)}
                className="rounded-md border border-muted/40 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Revogando…" : "Confirmar revogação"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
