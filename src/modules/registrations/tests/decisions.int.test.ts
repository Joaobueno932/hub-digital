/**
 * Testes de integração das decisões de cadastro (PostgreSQL real do Docker).
 * Fixtures próprias criadas e removidas por teste — não altera dados do seed.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { approveRegistrationRequest } from "../services/approve-registration";
import { rejectRegistrationRequest } from "../services/reject-registration";
import {
  InvalidPayloadError,
  RegistrationConflictError,
  RegistrationNotFoundError,
  SelfReviewError,
} from "../services/errors";
import { hasPermission } from "@/modules/permissions/services/authorization";

let admHubId: string;
let admStartupId: string;
let requesterId: string;

const createdRequestIds: string[] = [];
const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];

async function createRequest(
  overrides: Partial<
    import("@/generated/prisma/client").Prisma.RegistrationRequestUncheckedCreateInput
  > = {},
) {
  const request = await prisma.registrationRequest.create({
    data: {
      type: "STARTUP",
      requesterId,
      payload: {
        organizationName: `Startup Teste ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contactName: "Requester Teste",
        contactEmail: "requester@test.local",
      },
      status: "PENDING",
      ...overrides,
    },
  });
  createdRequestIds.push(request.id);
  return request;
}

beforeAll(async () => {
  admHubId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "admhub@dev.hubdigital.local" },
    })
  ).id;
  admStartupId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "admstartup@dev.hubdigital.local" },
    })
  ).id;
  const requester = await prisma.user.create({
    data: {
      name: "Requester Teste",
      email: `requester-${Date.now()}@test.local`,
      status: "PENDING",
    },
  });
  requesterId = requester.id;
  createdUserIds.push(requester.id);
});

afterAll(async () => {
  // Limpeza das fixtures (ordem respeitando FKs).
  const requests = await prisma.registrationRequest.findMany({
    where: { id: { in: createdRequestIds } },
  });
  const orgIds = [
    ...createdOrgIds,
    ...requests
      .map((r) => r.resultingOrganizationId)
      .filter((v): v is string => Boolean(v)),
  ];
  await prisma.registrationRequest.deleteMany({
    where: { id: { in: createdRequestIds } },
  });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { entityId: { in: createdRequestIds } },
        { organizationId: { in: orgIds } },
      ],
    },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  const memberships = await prisma.membership.findMany({
    where: { organizationId: { in: orgIds } },
  });
  await prisma.membershipRole.deleteMany({
    where: { membershipId: { in: memberships.map((m) => m.id) } },
  });
  await prisma.membership.deleteMany({
    where: { organizationId: { in: orgIds } },
  });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("permissões de revisão", () => {
  it("ADM_HUB possui as permissões de revisão; ADM_STARTUP não", async () => {
    const hub = await prisma.organization.findUniqueOrThrow({
      where: { slug: "hub-digital" },
    });
    expect(await hasPermission(admHubId, hub.id, "registrations.approve")).toBe(
      true,
    );
    expect(
      await hasPermission(admStartupId, null, "registrations.approve"),
    ).toBe(false);
    expect(await hasPermission(admStartupId, null, "registrations.list")).toBe(
      false,
    );
  });
});

describe("aprovação", () => {
  it("aprova startup: cria organização, vínculo com ADM_STARTUP, notificação e auditoria", async () => {
    const request = await createRequest();
    const result = await approveRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
    });

    expect(result.organizationId).toBeTruthy();
    expect(result.membershipId).toBeTruthy();

    const updated = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(updated.status).toBe("APPROVED");
    expect(updated.decidedById).toBe(admHubId);
    expect(updated.resultingOrganizationId).toBe(result.organizationId);
    expect(updated.resultingMembershipId).toBe(result.membershipId);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { id: result.membershipId! },
      include: { roles: { include: { role: true } } },
    });
    expect(membership.userId).toBe(requesterId);
    expect(membership.roles.map((r) => r.role.code)).toContain("ADM_STARTUP");

    const notifications = await prisma.notification.findMany({
      where: { userId: requesterId, type: "registration.approved" },
    });
    expect(notifications.length).toBe(1);

    const audits = await prisma.auditLog.findMany({
      where: { entityId: request.id, action: "registration_request.approved" },
    });
    expect(audits.length).toBe(1);
  });

  it("aprova espaço de inovação com papel ADM_ESPACO_INOVACAO", async () => {
    const request = await createRequest({
      type: "ESPACO_INOVACAO",
      payload: {
        organizationName: `Espaço Teste ${Date.now()}`,
        contactName: "Requester Teste",
        contactEmail: "requester@test.local",
      },
    });
    const result = await approveRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
    });
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: result.organizationId! },
      include: { type: true },
    });
    expect(org.type.code).toBe("ESPACO_INOVACAO");
    const membership = await prisma.membership.findUniqueOrThrow({
      where: { id: result.membershipId! },
      include: { roles: { include: { role: true } } },
    });
    expect(membership.roles.map((r) => r.role.code)).toContain(
      "ADM_ESPACO_INOVACAO",
    );
  });

  it("aprova USER ativando o usuário sem criar organização", async () => {
    const pendingUser = await prisma.user.create({
      data: {
        name: "Pendente",
        email: `pending-${Date.now()}@test.local`,
        status: "PENDING",
      },
    });
    createdUserIds.push(pendingUser.id);
    const request = await createRequest({
      type: "USER",
      requesterId: pendingUser.id,
      payload: { contactName: "Pendente", contactEmail: pendingUser.email },
    });
    const result = await approveRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
    });
    expect(result.organizationId).toBeNull();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: pendingUser.id },
    });
    expect(user.status).toBe("ACTIVE");
  });

  it("payload inválido não pode ser aprovado", async () => {
    const request = await createRequest({ payload: { legacy: true } });
    await expect(
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);
    const unchanged = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(unchanged.status).toBe("PENDING"); // nenhuma alteração parcial
  });

  it("ID inexistente retorna erro de não encontrado", async () => {
    await expect(
      approveRegistrationRequest({
        requestId: "00000000-0000-4000-8000-000000000000",
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(RegistrationNotFoundError);
  });
});

describe("reprovação", () => {
  it("reprova com justificativa, notifica e audita", async () => {
    const request = await createRequest();
    await rejectRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
      reason: "  Dados insuficientes para análise.  ",
    });
    const updated = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(updated.status).toBe("REJECTED");
    expect(updated.decisionReason).toBe("Dados insuficientes para análise.");
    expect(updated.decidedById).toBe(admHubId);

    const notifications = await prisma.notification.findMany({
      where: { userId: requesterId, type: "registration.rejected" },
    });
    expect(notifications.length).toBeGreaterThanOrEqual(1);

    const audits = await prisma.auditLog.findMany({
      where: { entityId: request.id, action: "registration_request.rejected" },
    });
    expect(audits.length).toBe(1);

    // Nada foi criado nem apagado.
    expect(updated.resultingOrganizationId).toBeNull();
    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: requesterId },
    });
    expect(requester.deletedAt).toBeNull();
  });
});

describe("estados, idempotência e concorrência", () => {
  it("solicitação já aprovada não pode ser aprovada nem reprovada de novo", async () => {
    const request = await createRequest();
    await approveRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
    });

    await expect(
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(RegistrationConflictError);
    await expect(
      rejectRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
        reason: "Justificativa qualquer válida.",
      }),
    ).rejects.toBeInstanceOf(RegistrationConflictError);

    // Nenhuma duplicação após a repetição.
    const orgs = await prisma.organization.count({
      where: { registrationRequests: { some: { id: request.id } } },
    });
    expect(orgs).toBe(1);
    const approvedNotifs = await prisma.notification.count({
      where: { userId: requesterId, type: "registration.approved" },
    });
    const approvedRequests = await prisma.registrationRequest.count({
      where: { requesterId, status: "APPROVED" },
    });
    expect(approvedNotifs).toBe(approvedRequests); // 1 notificação por aprovação
  });

  it("solicitação já reprovada não pode ser aprovada", async () => {
    const request = await createRequest();
    await rejectRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
      reason: "Justificativa suficiente para reprovar.",
    });
    await expect(
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(RegistrationConflictError);
  });

  it("aprovações concorrentes: apenas uma processa", async () => {
    const request = await createRequest();
    const results = await Promise.allSettled([
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(1);

    const membershipCount = await prisma.membership.count({
      where: {
        userId: requesterId,
        organizationId:
          (
            await prisma.registrationRequest.findUniqueOrThrow({
              where: { id: request.id },
            })
          ).resultingOrganizationId ?? undefined,
      },
    });
    expect(membershipCount).toBe(1);

    // A auditoria do conflito de corrida deve PERSISTIR: o perdedor grava
    // `processing_conflict` fora da transação revertida (antes da correção,
    // o registro era gravado dentro da transação e desaparecia no rollback).
    const conflictAudits = await prisma.auditLog.count({
      where: {
        entityId: request.id,
        action: "registration_request.processing_conflict",
      },
    });
    expect(conflictAudits).toBe(1);
  });

  it("reprovações concorrentes: apenas uma processa", async () => {
    const request = await createRequest();
    const results = await Promise.allSettled([
      rejectRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
        reason: "Justificativa concorrente número um.",
      }),
      rejectRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
        reason: "Justificativa concorrente número dois.",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    const audits = await prisma.auditLog.count({
      where: { entityId: request.id, action: "registration_request.rejected" },
    });
    expect(audits).toBe(1);

    // O conflito de corrida na reprovação também deve ficar registrado.
    const conflictAudits = await prisma.auditLog.count({
      where: {
        entityId: request.id,
        action: "registration_request.processing_conflict",
      },
    });
    expect(conflictAudits).toBe(1);
  });

  it("conflito sequencial (já processada) não gera auditoria de processing_conflict", async () => {
    // Comportamento preservado: aprovar de novo uma solicitação já decidida
    // cai no pré-check (antes da transação) e lança conflito SEM auditar —
    // não é uma corrida, é clique em algo já processado.
    const request = await createRequest();
    await approveRegistrationRequest({
      requestId: request.id,
      actorId: admHubId,
      actorOrganizationId: null,
    });

    await expect(
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(RegistrationConflictError);

    const conflictAudits = await prisma.auditLog.count({
      where: {
        entityId: request.id,
        action: "registration_request.processing_conflict",
      },
    });
    expect(conflictAudits).toBe(0);

    // A operação bloqueada não alterou os dados de negócio: continua uma única
    // organização/vínculo resultantes da primeira aprovação.
    const updated = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(updated.status).toBe("APPROVED");
    const orgs = await prisma.organization.count({
      where: { id: updated.resultingOrganizationId ?? undefined },
    });
    expect(orgs).toBe(1);
  });
});

describe("autoaprovação", () => {
  it("solicitante não aprova nem reprova a própria solicitação, e a tentativa é auditada", async () => {
    const request = await createRequest({ requesterId: admHubId });
    await expect(
      approveRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(SelfReviewError);
    await expect(
      rejectRegistrationRequest({
        requestId: request.id,
        actorId: admHubId,
        actorOrganizationId: null,
        reason: "Tentativa de autorreprovação.",
      }),
    ).rejects.toBeInstanceOf(SelfReviewError);

    const unchanged = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(unchanged.status).toBe("PENDING");

    const blocked = await prisma.auditLog.count({
      where: {
        entityId: request.id,
        action: "registration_request.self_review_blocked",
      },
    });
    expect(blocked).toBe(2);
  });
});
