"use client";

import { useActionState, useState } from "react";
import {
  setGlobalFlagAction,
  setOrganizationOverrideAction,
  removeOrganizationOverrideAction,
  type FlagFormState,
} from "../actions/manage-flags";

const initialState: FlagFormState = { status: "idle" };

export type FlagRow = {
  key: string;
  name: string;
  module: string;
  description: string;
  superAdminOnly: boolean;
  globalEnabled: boolean;
  overrideEnabled: boolean | null;
  effective: boolean;
  source: "global" | "organization";
  updatedAt: string | null;
  updatedByName: string | null;
  canChange: boolean;
};

export type OrganizationOption = { id: string; name: string };

export function FlagsPanel({
  flags,
  organizations,
  selectedOrganizationId,
  canUpdateOverride,
  canRemoveOverride,
}: {
  flags: FlagRow[];
  organizations: OrganizationOption[];
  selectedOrganizationId: string | null;
  canUpdateOverride: boolean;
  canRemoveOverride: boolean;
}) {
  const [globalState, globalAction, globalPending] = useActionState(
    setGlobalFlagAction,
    initialState,
  );
  const [overrideState, overrideAction, overridePending] = useActionState(
    setOrganizationOverrideAction,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeOrganizationOverrideAction,
    initialState,
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const feedback =
    globalState.status !== "idle"
      ? globalState
      : overrideState.status !== "idle"
        ? overrideState
        : removeState;

  return (
    <div className="mt-6 space-y-4">
      {feedback.status === "success" ? (
        <p
          role="status"
          className="rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          {feedback.message}
        </p>
      ) : null}
      {feedback.status === "error" ? (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl bg-surface shadow-sm">
        <table className="hidden w-full text-left text-sm lg:table">
          <thead className="border-b border-muted/20 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Módulo/recurso
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Global
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Organização
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Efetivo
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Origem
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Última alteração
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr
                key={flag.key}
                className="border-b border-muted/10 last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-primary">{flag.name}</span>
                  <span className="block text-xs text-muted">
                    {flag.key} · módulo {flag.module}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StateBadge enabled={flag.globalEnabled} />
                </td>
                <td className="px-4 py-3">
                  {selectedOrganizationId === null ? (
                    <span className="text-xs text-muted">—</span>
                  ) : flag.overrideEnabled === null ? (
                    <span className="text-xs text-muted">Sem override</span>
                  ) : (
                    <StateBadge enabled={flag.overrideEnabled} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <StateBadge enabled={flag.effective} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {flag.source === "organization" ? "Organização" : "Global"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {flag.updatedAt
                    ? `${new Date(flag.updatedAt).toLocaleString("pt-BR")}${
                        flag.updatedByName ? ` · ${flag.updatedByName}` : ""
                      }`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    flag={flag}
                    selectedOrganizationId={selectedOrganizationId}
                    canUpdateOverride={canUpdateOverride}
                    canRemoveOverride={canRemoveOverride}
                    pending={globalPending || overridePending || removePending}
                    globalAction={globalAction}
                    overrideAction={overrideAction}
                    removeAction={removeAction}
                    expanded={activeKey === flag.key}
                    onToggle={() =>
                      setActiveKey(activeKey === flag.key ? null : flag.key)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Cards em telas menores */}
        <ul className="divide-y divide-muted/10 lg:hidden">
          {flags.map((flag) => (
            <li key={flag.key} className="p-4">
              <p className="font-medium text-primary">{flag.name}</p>
              <p className="text-xs text-muted">
                {flag.key} · módulo {flag.module}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Global:</span>
                <StateBadge enabled={flag.globalEnabled} />
                <span className="text-muted">Efetivo:</span>
                <StateBadge enabled={flag.effective} />
                <span className="text-muted">
                  ({flag.source === "organization" ? "organização" : "global"})
                </span>
              </p>
              <div className="mt-3">
                <RowActions
                  flag={flag}
                  selectedOrganizationId={selectedOrganizationId}
                  canUpdateOverride={canUpdateOverride}
                  canRemoveOverride={canRemoveOverride}
                  pending={globalPending || overridePending || removePending}
                  globalAction={globalAction}
                  overrideAction={overrideAction}
                  removeAction={removeAction}
                  expanded={activeKey === flag.key}
                  onToggle={() =>
                    setActiveKey(activeKey === flag.key ? null : flag.key)
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {organizations.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma organização cadastrada.</p>
      ) : null}
    </div>
  );
}

function StateBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        enabled ? "bg-success/10 text-success" : "bg-muted/20 text-muted"
      }`}
    >
      {enabled ? "Habilitado" : "Desabilitado"}
    </span>
  );
}

function RowActions({
  flag,
  selectedOrganizationId,
  canUpdateOverride,
  canRemoveOverride,
  pending,
  globalAction,
  overrideAction,
  removeAction,
  expanded,
  onToggle,
}: {
  flag: FlagRow;
  selectedOrganizationId: string | null;
  canUpdateOverride: boolean;
  canRemoveOverride: boolean;
  pending: boolean;
  globalAction: (formData: FormData) => void;
  overrideAction: (formData: FormData) => void;
  removeAction: (formData: FormData) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!flag.canChange) {
    return (
      <span className="text-xs text-muted">Somente super administrador</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={globalAction}>
        <input type="hidden" name="key" value={flag.key} />
        <input
          type="hidden"
          name="enabled"
          value={flag.globalEnabled ? "false" : "true"}
        />
        <input
          type="hidden"
          name="expectedCurrent"
          value={flag.globalEnabled ? "true" : "false"}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-muted/40 px-2 py-1 text-xs hover:bg-muted/10 disabled:opacity-50"
        >
          {flag.globalEnabled ? "Desabilitar global" : "Habilitar global"}
        </button>
      </form>

      {selectedOrganizationId ? (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="rounded border border-muted/40 px-2 py-1 text-xs hover:bg-muted/10"
          >
            Override
          </button>
          {expanded ? (
            <div className="flex flex-wrap items-center gap-2">
              {canUpdateOverride ? (
                <>
                  <form action={overrideAction}>
                    <input type="hidden" name="key" value={flag.key} />
                    <input
                      type="hidden"
                      name="organizationId"
                      value={selectedOrganizationId}
                    />
                    <input type="hidden" name="enabled" value="true" />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded border border-success/40 px-2 py-1 text-xs text-success hover:bg-success/10 disabled:opacity-50"
                    >
                      Habilitar aqui
                    </button>
                  </form>
                  <form action={overrideAction}>
                    <input type="hidden" name="key" value={flag.key} />
                    <input
                      type="hidden"
                      name="organizationId"
                      value={selectedOrganizationId}
                    />
                    <input type="hidden" name="enabled" value="false" />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded border border-warning/40 px-2 py-1 text-xs text-warning hover:bg-warning/10 disabled:opacity-50"
                    >
                      Desabilitar aqui
                    </button>
                  </form>
                </>
              ) : null}
              {canRemoveOverride && flag.overrideEnabled !== null ? (
                <form action={removeAction}>
                  <input type="hidden" name="key" value={flag.key} />
                  <input
                    type="hidden"
                    name="organizationId"
                    value={selectedOrganizationId}
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Remover override
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
