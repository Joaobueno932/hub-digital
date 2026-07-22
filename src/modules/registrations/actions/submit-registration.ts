"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization, getCurrentUser } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  buildInnovationSpacePayload,
  buildStartupPayload,
  innovationSpaceSubmissionSchema,
  startupSubmissionSchema,
} from "../schemas/submission";
import { submitRegistrationRequest } from "../services/submit-registration";
import { SubmissionConflictError } from "../services/errors";
import type { RegistrationType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export type SubmitState = {
  status: "error" | "conflict" | "rate_limited" | "invalid";
  message: string;
};

/**
 * Hash de IP ANONIMIZADO (último octeto/segmentos zerados) — usado apenas como
 * chave efêmera de rate limit em memória. O IP bruto nunca é persistido.
 */
async function anonymizedIpHash(): Promise<string> {
  const h = await headers();
  const raw = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  let anon = raw;
  if (raw.includes(".")) {
    const p = raw.split(".");
    if (p.length === 4) anon = `${p[0]}.${p[1]}.${p[2]}.0`;
  } else if (raw.includes(":")) {
    anon = raw.split(":").slice(0, 4).join(":");
  }
  return createHash("sha256").update(anon).digest("hex").slice(0, 16);
}

type SubmissionConfig = { type: "STARTUP" } | { type: "ESPACO_INOVACAO" };

async function handleSubmission(
  cfg: SubmissionConfig,
  input: unknown,
): Promise<SubmitState> {
  const user = await getCurrentUser();
  if (!user) {
    // A página exige sessão; se chegou aqui sem usuário, é fluxo anômalo.
    return {
      status: "error",
      message: "Faça login para enviar a solicitação.",
    };
  }

  const type = cfg.type as RegistrationType;

  // Rate limiting: por usuário e por IP anonimizado (memória — dev).
  const ipHash = await anonymizedIpHash();
  const okUser = checkRateLimit(`reg-submit:user:${user.id}`, 5, 60_000);
  const okIp = checkRateLimit(`reg-submit:ip:${ipHash}`, 10, 60_000);
  if (!okUser || !okIp) {
    await audit(user.id, "registration_request.rate_limited", { type });
    return {
      status: "rate_limited",
      message: "Muitas tentativas. Tente novamente em instantes.",
    };
  }

  const schema =
    cfg.type === "STARTUP"
      ? startupSubmissionSchema
      : innovationSpaceSubmissionSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    // Honeypot ou campos inválidos: mensagem genérica, sem revelar regras.
    await audit(user.id, "registration_request.invalid_payload", { type });
    const first = parsed.error.issues[0];
    return {
      status: "invalid",
      message: first?.message ?? "Verifique os campos e tente novamente.",
    };
  }

  // O honeypot já é validado pelo schema (companyWebsite precisa estar vazio);
  // se veio preenchido, o parse acima falha e retorna "invalid".

  const payload =
    cfg.type === "STARTUP"
      ? buildStartupPayload(parsed.data as never)
      : buildInnovationSpacePayload(parsed.data as never);

  const activeOrg = await getActiveOrganization();

  try {
    await submitRegistrationRequest({
      type,
      requesterId: user.id,
      payload,
      actorOrganizationId: activeOrg?.id ?? null,
    });
  } catch (error) {
    if (error instanceof SubmissionConflictError) {
      await audit(user.id, "registration_request.submission_conflict", {
        type,
        existingStatus: error.existingStatus,
      });
      return {
        status: "conflict",
        message: conflictMessage(error.existingStatus),
      };
    }
    console.error("registration submission error", error);
    return {
      status: "error",
      message: "Não foi possível enviar. Tente novamente.",
    };
  }

  revalidatePath("/app/minhas-solicitacoes");
  revalidatePath("/app/admin/cadastros");
  redirect("/cadastro/enviado");
}

function conflictMessage(status: "PENDING" | "APPROVED" | "REJECTED"): string {
  if (status === "PENDING")
    return "Você já tem uma solicitação deste tipo em análise. Aguarde o retorno.";
  if (status === "APPROVED")
    return "Você já possui uma solicitação aprovada deste tipo.";
  return "Sua solicitação anterior não foi aprovada. O reenvio ainda não está disponível.";
}

async function audit(
  actorId: string,
  action: string,
  metadata: Prisma.InputJsonObject,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType: "registration_request", metadata },
  });
}

export async function submitStartupRequestAction(
  input: unknown,
): Promise<SubmitState> {
  return handleSubmission({ type: "STARTUP" }, input);
}

export async function submitInnovationSpaceRequestAction(
  input: unknown,
): Promise<SubmitState> {
  return handleSubmission({ type: "ESPACO_INOVACAO" }, input);
}
