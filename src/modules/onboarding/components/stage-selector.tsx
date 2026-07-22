"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Lightbulb,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ONBOARDING_STAGES } from "../config/stages";
import { saveDraftAction, type SaveDraftState } from "../actions/save-draft";
import type { OnboardingStage } from "@/generated/prisma/enums";

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Lightbulb,
  Users,
  Rocket,
  Building2,
};

const initialState: SaveDraftState = { status: "idle" };

/**
 * Grupo de seleção única (radiogroup) das cinco opções.
 * Acessível: fieldset/legend, radios nativos, foco visível, operável por
 * teclado; a seleção não é indicada apenas por cor (marcador + borda + ícone).
 */
export function StageSelector({
  initialStage,
}: {
  initialStage: OnboardingStage | null;
}) {
  const [selected, setSelected] = useState<OnboardingStage | "">(
    initialStage ?? "",
  );
  const [state, formAction, pending] = useActionState(
    saveDraftAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6">
      <fieldset>
        <legend className="text-lg font-semibold text-primary">
          Qual é o seu momento hoje?
        </legend>
        <p className="mt-1 text-sm text-muted">
          Escolha a opção que melhor descreve o seu estágio atual. Você poderá
          salvar e continuar depois.
        </p>

        <div className="mt-6 grid gap-3">
          {ONBOARDING_STAGES.map((stage) => {
            const Icon = ICONS[stage.icon] ?? Sparkles;
            const isSelected = selected === stage.value;
            return (
              <label
                key={stage.value}
                className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 bg-surface p-4 shadow-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-accent ${
                  isSelected
                    ? "border-accent ring-1 ring-accent"
                    : "border-transparent hover:border-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="selectedStage"
                  value={stage.value}
                  checked={isSelected}
                  onChange={() => setSelected(stage.value)}
                  aria-label={stage.title}
                  aria-describedby={`${stage.value}-desc`}
                  className="mt-1 h-4 w-4 accent-[color:var(--color-accent)]"
                />
                <Icon
                  aria-hidden
                  className={`mt-0.5 h-5 w-5 shrink-0 ${isSelected ? "text-accent" : "text-primary"}`}
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-primary">
                    {stage.title}
                  </span>
                  <span
                    id={`${stage.value}-desc`}
                    className="mt-0.5 block text-sm text-muted"
                  >
                    {stage.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "saved" ? (
        <p
          role="status"
          className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intent"
          value="continue"
          disabled={pending || !selected}
          className="rounded-md bg-accent px-5 py-2.5 font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-50"
        >
          Continuar
        </button>
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={pending || !selected}
          className="rounded-md border border-muted/40 px-5 py-2.5 font-semibold text-primary hover:bg-background disabled:opacity-50"
        >
          Salvar e continuar depois
        </button>
        <Link
          href="/app"
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          Voltar ao painel
        </Link>
      </div>
    </form>
  );
}
