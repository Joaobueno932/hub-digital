"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  suspendOrganizationAction,
  reactivateOrganizationAction,
  type OrganizationFormState,
} from "../actions/suspend-organization";

const initialState: OrganizationFormState = { status: "idle" };

export function OrganizationStatusActions({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string;
}) {
  const [mode, setMode] = useState<"idle" | "suspend" | "reactivate">("idle");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [suspendState, suspendAction, suspending] = useActionState(
    suspendOrganizationAction,
    initialState,
  );
  const [reactivateState, reactivateAction, reactivating] = useActionState(
    reactivateOrganizationAction,
    initialState,
  );

  const state = mode === "reactivate" ? reactivateState : suspendState;
  const pending = suspending || reactivating;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const shouldBeOpen = mode !== "idle" && state.status !== "success";
    if (shouldBeOpen && !dialog.open) dialog.showModal();
    if (!shouldBeOpen && dialog.open) dialog.close();
  }, [mode, state.status]);

  return (
    <div className="mt-4">
      {state.status === "success" ? (
        <p
          role="status"
          className="mb-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      {status === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => setMode("suspend")}
          className="rounded-md border border-warning/40 px-4 py-2 text-sm text-warning hover:bg-warning/10"
        >
          Suspender organização
        </button>
      ) : status === "SUSPENDED" ? (
        <button
          type="button"
          onClick={() => setMode("reactivate")}
          className="rounded-md border border-success/40 px-4 py-2 text-sm text-success hover:bg-success/10"
        >
          Reativar organização
        </button>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setMode("idle")}
        aria-label="Confirmar alteração de status"
        className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        {mode === "suspend" ? (
          <form action={suspendAction} className="p-6">
            <h2 className="text-lg font-bold text-primary">
              Suspender organização
            </h2>
            <p className="mt-2 text-sm text-muted">
              Os membros perderão acesso a esta organização enquanto ela estiver
              suspensa. Nenhum dado é apagado.
            </p>
            <input type="hidden" name="organizationId" value={organizationId} />
            {suspendState.status === "error" ? (
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {suspendState.message}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="rounded-md border border-muted/40 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {suspending ? "Suspendendo…" : "Confirmar suspensão"}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "reactivate" ? (
          <form action={reactivateAction} className="p-6">
            <h2 className="text-lg font-bold text-primary">
              Reativar organização
            </h2>
            <p className="mt-2 text-sm text-muted">
              Os membros voltarão a ter acesso normalmente.
            </p>
            <input type="hidden" name="organizationId" value={organizationId} />
            {reactivateState.status === "error" ? (
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {reactivateState.message}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="rounded-md border border-muted/40 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
              >
                {reactivating ? "Reativando…" : "Confirmar reativação"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
