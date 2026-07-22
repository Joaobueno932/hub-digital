"use client";

import { useRef } from "react";
import { switchOrganizationAction } from "@/modules/organizations/actions/switch-organization";

export type OrgOption = { id: string; name: string; typeName: string };

export function OrgSwitcher({
  options,
  activeId,
}: {
  options: OrgOption[];
  activeId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (options.length === 0) return null;

  const active = options.find((o) => o.id === activeId) ?? options[0];

  if (options.length === 1) {
    return (
      <p className="text-sm text-white/85">
        <span className="font-semibold">{active.name}</span>
        <span className="ml-2 rounded bg-secondary/30 px-2 py-0.5 text-xs text-secondary">
          {active.typeName}
        </span>
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={switchOrganizationAction}
      className="flex items-center gap-2"
    >
      <label htmlFor="organizationId" className="sr-only">
        Organização ativa
      </label>
      <select
        id="organizationId"
        name="organizationId"
        defaultValue={active.id}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-white/30 bg-primary-dark px-2 py-1.5 text-sm text-white"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} — {o.typeName}
          </option>
        ))}
      </select>
    </form>
  );
}
