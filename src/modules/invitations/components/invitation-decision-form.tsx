"use client";

import { useActionState } from "react";
import {
  acceptInvitationAction,
  declineInvitationAction,
  type InvitationDecisionState,
} from "../actions/decide-invitation";

const initialState: InvitationDecisionState = { status: "idle" };

export function InvitationDecisionForm({ token }: { token: string }) {
  const [acceptState, acceptAction, accepting] = useActionState(
    acceptInvitationAction,
    initialState,
  );
  const [declineState, declineAction, declining] = useActionState(
    declineInvitationAction,
    initialState,
  );

  if (declineState.status === "success") {
    return (
      <p role="status" className="rounded-md bg-muted/10 px-3 py-2 text-sm">
        {declineState.message}
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {acceptState.status === "error" ? (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {acceptState.message}
        </p>
      ) : null}
      {declineState.status === "error" ? (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {declineState.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <form action={acceptAction}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            disabled={accepting || declining}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
          >
            {accepting ? "Aceitando…" : "Aceitar convite"}
          </button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            disabled={accepting || declining}
            className="rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            {declining ? "Recusando…" : "Recusar"}
          </button>
        </form>
      </div>
    </div>
  );
}
