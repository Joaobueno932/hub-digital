import { z } from "zod";
import { ONBOARDING_STAGE_VALUES } from "@/modules/onboarding/config/stages";

/**
 * Schemas das SOLICITAÇÕES INSTITUCIONAIS públicas (Startup / Espaço de Inovação).
 *
 * Estes schemas são a fonte de verdade da submissão (client + server). Eles
 * produzem exatamente os campos persistidos em RegistrationRequest.payload —
 * compatíveis com `organizationPayloadSchema` usado na aprovação.
 *
 * O tipo da solicitação vem SEMPRE da rota/action, nunca do payload do cliente.
 * status/reviewedAt/resultingOrganizationId/papéis nunca são aceitos aqui.
 */

export const SUBMISSION_SCHEMA_VERSION = 1;
export const CURRENT_TERMS_VERSION = "provisorio-2026-07";
export const CURRENT_PRIVACY_VERSION = "provisorio-2026-07";

// Unidades federativas do Brasil (UF).
export const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

// Normaliza texto: remove espaços nas pontas e colapsa espaços internos.
const normalizedText = (min: number, max: number, label: string) =>
  z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(min, `${label} é obrigatório.`)
        .max(max, `${label} está muito longo.`),
    );

const optionalNormalizedText = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max))
    .optional()
    .or(z.literal("").transform(() => undefined));

const emailField = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.email("Informe um e-mail válido.").max(200));

// Telefone opcional (origem: story maps de cadastro "Inserir telefone").
const phoneField = z
  .string()
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(z.string().max(30))
  .optional()
  .or(z.literal("").transform(() => undefined));

const websiteField = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.url("Informe uma URL válida (ex.: https://...).").max(300))
  .optional()
  .or(z.literal("").transform(() => undefined));

const acceptanceField = z
  .boolean()
  .refine((v) => v === true, "É necessário aceitar para continuar.");

// Honeypot: campo oculto que humanos não preenchem. Deve permanecer vazio.
const honeypotField = z
  .string()
  .max(0, "Envio inválido.")
  .optional()
  .or(z.literal("").transform(() => undefined));

const stateField = z.enum(BRAZIL_STATES, {
  message: "Selecione o estado (UF).",
});

const commonFields = {
  responsibleName: normalizedText(2, 120, "Nome do responsável"),
  email: emailField,
  phone: phoneField,
  description: normalizedText(10, 600, "Descrição"),
  city: normalizedText(2, 100, "Cidade"),
  state: stateField,
  website: websiteField,
  acceptedTerms: acceptanceField,
  acceptedPrivacy: acceptanceField,
  // honeypot — nome plausível para atrair bots.
  companyWebsite: honeypotField,
};

export const startupSubmissionSchema = z.object({
  ...commonFields,
  startupName: normalizedText(2, 140, "Nome da startup"),
  stage: z.enum(ONBOARDING_STAGE_VALUES, {
    message: "Selecione o estágio atual.",
  }),
});

export const innovationSpaceSubmissionSchema = z.object({
  ...commonFields,
  spaceName: normalizedText(2, 140, "Nome do espaço"),
  institution: optionalNormalizedText(160),
});

export type StartupSubmissionInput = z.input<typeof startupSubmissionSchema>;
export type StartupSubmission = z.infer<typeof startupSubmissionSchema>;
export type InnovationSpaceSubmissionInput = z.input<
  typeof innovationSpaceSubmissionSchema
>;
export type InnovationSpaceSubmission = z.infer<
  typeof innovationSpaceSubmissionSchema
>;

/** Constrói o payload persistido (compatível com organizationPayloadSchema). */
export function buildStartupPayload(data: StartupSubmission) {
  return {
    organizationName: data.startupName,
    contactName: data.responsibleName,
    contactEmail: data.email,
    contactPhone: data.phone,
    description: data.description,
    city: data.city,
    state: data.state,
    website: data.website,
    stage: data.stage,
    source: "public_form",
    schemaVersion: SUBMISSION_SCHEMA_VERSION,
    acceptedTermsVersion: CURRENT_TERMS_VERSION,
    acceptedPrivacyVersion: CURRENT_PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
}

export function buildInnovationSpacePayload(data: InnovationSpaceSubmission) {
  return {
    organizationName: data.spaceName,
    contactName: data.responsibleName,
    contactEmail: data.email,
    contactPhone: data.phone,
    description: data.description,
    city: data.city,
    state: data.state,
    website: data.website,
    institution: data.institution,
    source: "public_form",
    schemaVersion: SUBMISSION_SCHEMA_VERSION,
    acceptedTermsVersion: CURRENT_TERMS_VERSION,
    acceptedPrivacyVersion: CURRENT_PRIVACY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
}
