"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  approveRegistrationAction,
  rejectRegistrationAction,
  type DecisionState,
} from "../actions/decide-registration";

const initialState: DecisionState = { status: "idle" };

/**
 * Painel de decisão: confirmação explícita antes de aprovar, formulário de
 * justificativa na reprovação. Diálogo com foco preso via <dialog> nativo.
 */
export function DecisionPanel({
  requestId,
  canApprove,
}: {
  requestId: string;
  canApprove: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [approveState, approveAction, approving] = useActionState(
    approveRegistrationAction,
    initialState,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectRegistrationAction,
    initialState,
  );

  const state = mode === "reject" ? rejectState : approveState;
  const pending = approving || rejecting;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const shouldBeOpen = mode !== "idle" && state.status !== "success";
    if (shouldBeOpen && !dialog.open) dialog.showModal();
    // Fechar via API do DOM dispara onClose, que devolve o modo para "idle".
    if (!shouldBeOpen && dialog.open) dialog.close();
  }, [mode, state.status]);

  return (
    <div className="mt-6">
      {state.status === "success" ? (
        <p
          role="status"
          className="rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {state.status !== "success" ? (
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canApprove || pending}
            onClick={() => setMode("approve")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode("reject")}
            className="rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Reprovar
          </button>
        </div>
      ) : null}
      {!canApprove ? (
        <p className="mt-2 text-xs text-warning">
          Aprovação indisponível: os dados enviados são inválidos ou estão em
          formato legado. A reprovação com justificativa continua possível.
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setMode("idle")}
        aria-label={
          mode === "approve" ? "Confirmar aprovação" : "Reprovar solicitação"
        }
        className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        {mode === "approve" ? (
          <form action={approveAction} className="p-6">
            <h2 className="text-lg font-bold text-primary">
              Confirmar aprovação
            </h2>
            <p className="mt-2 text-sm text-muted">
              Esta ação é definitiva: as entidades vinculadas (organização e
              acesso do solicitante) serão criadas automaticamente.
            </p>
            <input type="hidden" name="requestId" value={requestId} />
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
                {approving ? "Aprovando…" : "Confirmar aprovação"}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "reject" ? (
          <form action={rejectAction} className="p-6">
            <h2 className="text-lg font-bold text-primary">
              Reprovar solicitação
            </h2>
            <p className="mt-2 text-sm text-muted">
              A justificativa é obrigatória e será enviada ao solicitante.
            </p>
            <input type="hidden" name="requestId" value={requestId} />
            <label htmlFor="reason" className="mt-4 block text-sm font-medium">
              Justificativa
            </label>
            <textarea
              id="reason"
              name="reason"
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
            />
            {rejectState.status === "error" ? (
              <p role="alert" className="mt-2 text-xs text-danger">
                {rejectState.message}
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
                {rejecting ? "Reprovando…" : "Confirmar reprovação"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
