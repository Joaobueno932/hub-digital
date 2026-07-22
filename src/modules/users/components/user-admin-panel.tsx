"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateUserAction,
  suspendUserAction,
  reactivateUserAction,
  type UserFormState,
} from "../actions/manage-user";

const initialState: UserFormState = { status: "idle" };

export type UserAdminData = {
  id: string;
  name: string;
  email: string;
  status: string;
  updatedAt: string;
};

/**
 * Ações administrativas sobre a conta. Confirmação em `<dialog>` nativo
 * (foco preso, ESC) — nunca `window.confirm`.
 */
export function UserAdminPanel({
  user,
  canUpdate,
  canSuspend,
  canReactivate,
}: {
  user: UserAdminData;
  canUpdate: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "suspend" | "reactivate">("idle");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [updateState, updateAction, updating] = useActionState(
    updateUserAction,
    initialState,
  );
  const [suspendState, suspendAction, suspending] = useActionState(
    suspendUserAction,
    initialState,
  );
  const [reactivateState, reactivateAction, reactivating] = useActionState(
    reactivateUserAction,
    initialState,
  );

  const dialogState = mode === "reactivate" ? reactivateState : suspendState;
  const pending = suspending || reactivating;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const shouldBeOpen = mode !== "idle" && dialogState.status !== "success";
    if (shouldBeOpen && !dialog.open) dialog.showModal();
    if (!shouldBeOpen && dialog.open) dialog.close();
  }, [mode, dialogState.status]);

  return (
    <div className="mt-6 space-y-6">
      {canUpdate ? (
        <section className="rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">Dados da conta</h2>
          {updateState.status === "success" ? (
            <p
              role="status"
              className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
            >
              {updateState.message}
            </p>
          ) : null}
          {updateState.status === "error" ? (
            <p
              role="alert"
              className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {updateState.message}
            </p>
          ) : null}
          <form
            action={updateAction}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="expectedUpdatedAt"
              value={user.updatedAt}
            />
            <div>
              <label htmlFor="name" className="block text-sm font-medium">
                Nome
              </label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={user.name}
                className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                value={user.email}
                readOnly
                aria-describedby="email-hint"
                className="mt-1 w-full rounded-md border border-muted/40 bg-muted/10 px-3 py-2 text-sm text-muted"
              />
              <p id="email-hint" className="mt-1 text-xs text-muted">
                Somente leitura: a alteração de e-mail exige fluxo de
                confirmação, ainda não implementado.
              </p>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={updating}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
              >
                {updating ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canSuspend || canReactivate ? (
        <section className="rounded-xl bg-surface p-6 shadow-sm">
          <h2 className="font-semibold text-primary">Status da conta</h2>
          <p className="mt-1 text-sm text-muted">
            Suspender impede novos logins e encerra o acesso da sessão atual no
            próximo carregamento. Nenhum dado é apagado.
          </p>
          {dialogState.status === "success" ? (
            <p
              role="status"
              className="mt-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
            >
              {dialogState.message}
            </p>
          ) : null}
          <div className="mt-4">
            {user.status === "SUSPENDED" ? (
              canReactivate ? (
                <button
                  type="button"
                  onClick={() => setMode("reactivate")}
                  className="rounded-md border border-success/40 px-4 py-2 text-sm text-success hover:bg-success/10"
                >
                  Reativar conta
                </button>
              ) : null
            ) : canSuspend ? (
              <button
                type="button"
                onClick={() => setMode("suspend")}
                className="rounded-md border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10"
              >
                Suspender conta
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setMode("idle")}
        aria-label="Confirmar alteração de status da conta"
        className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        {mode === "suspend" ? (
          <form action={suspendAction} className="p-6">
            <h2 className="text-lg font-bold text-primary">Suspender conta</h2>
            <p className="mt-2 text-sm text-muted">
              {user.name} deixará de acessar a plataforma até ser reativado(a).
            </p>
            <input type="hidden" name="userId" value={user.id} />
            <label htmlFor="reason" className="mt-4 block text-sm font-medium">
              Motivo
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              minLength={10}
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
            />
            {suspendState.status === "error" ? (
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {suspendState.message}
              </p>
            ) : null}
            <DialogActions
              pending={pending}
              onCancel={() => setMode("idle")}
              label="Confirmar suspensão"
              danger
            />
          </form>
        ) : null}

        {mode === "reactivate" ? (
          <form action={reactivateAction} className="p-6">
            <h2 className="text-lg font-bold text-primary">Reativar conta</h2>
            <p className="mt-2 text-sm text-muted">
              {user.name} voltará a acessar a plataforma normalmente.
            </p>
            <input type="hidden" name="userId" value={user.id} />
            {reactivateState.status === "error" ? (
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {reactivateState.message}
              </p>
            ) : null}
            <DialogActions
              pending={pending}
              onCancel={() => setMode("idle")}
              label="Confirmar reativação"
            />
          </form>
        ) : null}
      </dialog>
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
