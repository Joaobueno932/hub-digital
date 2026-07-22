"use client";

import { useActionState } from "react";
import {
  updateOwnOrganizationAction,
  updateAnyOrganizationAction,
  type OrganizationFormState,
} from "../actions/update-organization";

const initialState: OrganizationFormState = { status: "idle" };

type OrganizationFormValues = {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  updatedAt: string; // ISO
};

export function OrganizationForm({
  organization,
  scope,
}: {
  organization: OrganizationFormValues;
  scope: "own" | "admin";
}) {
  const action =
    scope === "own" ? updateOwnOrganizationAction : updateAnyOrganizationAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="mt-6 rounded-xl bg-surface p-6 shadow-sm"
    >
      <input type="hidden" name="organizationId" value={organization.id} />
      {/* revalidatePath no sucesso da action recria este componente com o
          updatedAt fresco vindo do servidor — não é preciso estado local. */}
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={organization.updatedAt}
      />

      {state.status === "success" ? (
        <p
          role="status"
          className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p
          role="alert"
          className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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
            defaultValue={organization.name}
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium">
            Nome de exibição
          </label>
          <input
            id="displayName"
            name="displayName"
            maxLength={120}
            defaultValue={organization.displayName ?? ""}
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={organization.description ?? ""}
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium">
            Site
          </label>
          <input
            id="website"
            name="website"
            type="url"
            maxLength={200}
            defaultValue={organization.website ?? ""}
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium">
            Cidade
          </label>
          <input
            id="city"
            name="city"
            maxLength={120}
            defaultValue={organization.city ?? ""}
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium">
            Estado (UF)
          </label>
          <input
            id="state"
            name="state"
            maxLength={2}
            defaultValue={organization.state ?? ""}
            className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm uppercase"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
