"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  completeOnboardingAction,
  type CompleteState,
} from "../actions/complete";

const initialState: CompleteState = { status: "idle" };

/**
 * Painel de finalização com confirmação explícita (dialog nativo, foco preso).
 * Não usa window.confirm.
 */
export function CompletePanel() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link
        href="/app/onboarding"
        className="rounded-md border border-muted/40 px-5 py-2.5 font-semibold text-primary hover:bg-background"
      >
        Voltar
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-5 py-2.5 font-semibold text-foreground-inverse hover:bg-accent-hover"
      >
        Finalizar
      </button>

      {state.status === "error" ? (
        <p
          role="alert"
          className="w-full rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        aria-label="Confirmar conclusão do onboarding"
        className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50"
      >
        <form action={formAction} className="p-6">
          <h2 className="text-lg font-bold text-primary">
            Concluir onboarding
          </h2>
          <p className="mt-2 text-sm text-muted">
            Ao concluir, o seu estágio será registrado. Você poderá consultá-lo
            depois no painel.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-muted/40 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Concluindo…" : "Confirmar conclusão"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
