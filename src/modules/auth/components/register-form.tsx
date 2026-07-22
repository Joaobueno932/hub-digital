"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type RegisterActionState } from "../actions/register";

const initialState: RegisterActionState = { status: "idle" };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="mt-6 space-y-4">
        <p
          role="status"
          className="rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        >
          {state.message}
        </p>
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent px-4 py-2 text-center font-semibold text-foreground-inverse hover:bg-accent-hover"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}
      <Field
        name="name"
        label="Nome completo"
        type="text"
        autoComplete="name"
        errors={state.fieldErrors?.name}
      />
      <Field
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        errors={state.fieldErrors?.email}
      />
      <Field
        name="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        hint="Mínimo de 8 caracteres, com letras e números."
        errors={state.fieldErrors?.password}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-4 py-2 font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Criar conta"}
      </button>
      <p className="text-sm">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  type,
  autoComplete,
  hint,
  errors,
}: {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
  errors?: string[];
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-describedby={
          [hint ? hintId : null, errors?.length ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-invalid={errors?.length ? true : undefined}
        className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
