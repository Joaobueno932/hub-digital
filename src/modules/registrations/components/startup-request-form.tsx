"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  startupSubmissionSchema,
  type StartupSubmissionInput,
} from "../schemas/submission";
import { BRAZIL_STATES } from "../schemas/submission";
import {
  submitStartupRequestAction,
  type SubmitState,
} from "../actions/submit-registration";
import { ONBOARDING_STAGES } from "@/modules/onboarding/config/stages";
import {
  CheckboxField,
  HoneypotField,
  SelectField,
  TextField,
  TextareaField,
} from "./request-fields";

export function StartupRequestForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const [serverState, setServerState] = useState<SubmitState | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StartupSubmissionInput>({
    resolver: zodResolver(startupSubmissionSchema),
    defaultValues: { responsibleName: defaultName, email: defaultEmail },
  });

  const onValid = handleSubmit(async (values) => {
    setServerState(null);
    const result = await submitStartupRequestAction(values);
    // Em caso de sucesso a action redireciona; só chega aqui em erro.
    if (result) setServerState(result);
  });

  return (
    <form onSubmit={onValid} className="mt-6 space-y-4" noValidate>
      {serverState ? (
        <p
          role="alert"
          className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {serverState.message}
        </p>
      ) : null}

      <HoneypotField name="companyWebsite" register={register} />

      <TextField
        name="responsibleName"
        label="Nome do responsável"
        required
        register={register}
        errors={errors}
        autoComplete="name"
      />
      <TextField
        name="email"
        label="E-mail"
        type="email"
        required
        register={register}
        errors={errors}
        autoComplete="email"
      />
      <TextField
        name="phone"
        label="Telefone"
        register={register}
        errors={errors}
        hint="Opcional."
        autoComplete="tel"
      />
      <TextField
        name="startupName"
        label="Nome da startup"
        required
        register={register}
        errors={errors}
      />
      <TextareaField
        name="description"
        label="Descrição curta"
        required
        register={register}
        errors={errors}
        hint="Conte em poucas linhas o que a sua startup faz."
      />
      <SelectField
        name="stage"
        label="Estágio atual"
        required
        register={register}
        errors={errors}
        placeholder="Selecione o estágio"
        options={ONBOARDING_STAGES.map((s) => ({
          value: s.value,
          label: s.title,
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <TextField
          name="city"
          label="Cidade"
          required
          register={register}
          errors={errors}
        />
        <SelectField
          name="state"
          label="Estado"
          required
          register={register}
          errors={errors}
          placeholder="UF"
          options={BRAZIL_STATES.map((uf) => ({ value: uf, label: uf }))}
        />
      </div>
      <TextField
        name="website"
        label="Site ou rede social"
        register={register}
        errors={errors}
        hint="Opcional (ex.: https://...)."
      />

      <fieldset className="space-y-2 rounded-md border border-muted/30 p-3">
        <legend className="px-1 text-xs font-medium text-muted">
          Consentimentos
        </legend>
        <CheckboxField
          name="acceptedTerms"
          label={
            <>
              Li e aceito os{" "}
              <Link
                href="/termos"
                className="text-primary underline"
                target="_blank"
              >
                Termos de uso
              </Link>
              .
            </>
          }
          register={register}
          errors={errors}
        />
        <CheckboxField
          name="acceptedPrivacy"
          label={
            <>
              Li e aceito a{" "}
              <Link
                href="/politica-privacidade"
                className="text-primary underline"
                target="_blank"
              >
                Política de privacidade
              </Link>
              .
            </>
          }
          register={register}
          errors={errors}
        />
      </fieldset>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-accent px-4 py-2 font-semibold text-foreground-inverse hover:bg-accent-hover disabled:opacity-60"
      >
        {isSubmitting ? "Enviando…" : "Enviar solicitação"}
      </button>
    </form>
  );
}
