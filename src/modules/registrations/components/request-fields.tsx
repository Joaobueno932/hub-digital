"use client";

import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
} from "react-hook-form";

// Primitivos acessíveis reutilizados pelos formulários de solicitação.

type BaseProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  hint?: string;
  required?: boolean;
};

function errorMessage(errors: FieldErrors, name: string): string | undefined {
  const e = errors[name as keyof typeof errors];
  return e && typeof e === "object" && "message" in e
    ? (e.message as string)
    : undefined;
}

export function TextField<T extends FieldValues>({
  name,
  label,
  register,
  errors,
  hint,
  required,
  type = "text",
  autoComplete,
}: BaseProps<T> & { type?: string; autoComplete?: string }) {
  const err = errorMessage(errors, name);
  const describedBy = [
    hint ? `${name}-hint` : null,
    err ? `${name}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <input
        id={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={err ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
        {...register(name)}
      />
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {err ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-danger">
          {err}
        </p>
      ) : null}
    </div>
  );
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  register,
  errors,
  hint,
  required,
}: BaseProps<T>) {
  const err = errorMessage(errors, name);
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <textarea
        id={name}
        rows={4}
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${name}-error` : undefined}
        className="mt-1 w-full rounded-md border border-muted/40 px-3 py-2 text-sm"
        {...register(name)}
      />
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {err ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-danger">
          {err}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  register,
  errors,
  required,
  options,
  placeholder,
}: BaseProps<T> & {
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  const err = errorMessage(errors, name);
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden className="text-danger">
            {" "}
            *
          </span>
        ) : null}
      </label>
      <select
        id={name}
        defaultValue=""
        aria-invalid={err ? true : undefined}
        aria-describedby={err ? `${name}-error` : undefined}
        className="mt-1 w-full rounded-md border border-muted/40 bg-surface px-3 py-2 text-sm"
        {...register(name)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {err ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-danger">
          {err}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField<T extends FieldValues>({
  name,
  label,
  register,
  errors,
}: Omit<BaseProps<T>, "label"> & { label: React.ReactNode }) {
  const err = errorMessage(errors, name);
  return (
    <div>
      <label htmlFor={name} className="flex items-start gap-2 text-sm">
        <input
          id={name}
          type="checkbox"
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${name}-error` : undefined}
          className="mt-0.5 h-4 w-4"
          {...register(name)}
        />
        <span>{label}</span>
      </label>
      {err ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-danger">
          {err}
        </p>
      ) : null}
    </div>
  );
}

/** Honeypot: oculto para humanos, presente no DOM para bots. */
export function HoneypotField<T extends FieldValues>({
  name,
  register,
}: {
  name: Path<T>;
  register: UseFormRegister<T>;
}) {
  return (
    <div
      aria-hidden
      className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden"
    >
      <label htmlFor={name}>Não preencha este campo</label>
      <input
        id={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...register(name)}
      />
    </div>
  );
}
