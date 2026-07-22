/**
 * Integração das solicitações institucionais públicas (Postgres real do Docker).
 * Fixtures próprias criadas e removidas por teste.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listMyRegistrationRequests,
  submitRegistrationRequest,
} from "../services/submit-registration";
import { approveRegistrationRequest } from "../services/approve-registration";
import { SubmissionConflictError } from "../services/errors";
import { buildStartupPayload } from "../schemas/submission";
import { parseRegistrationPayload } from "../schemas/payloads";

const createdUserIds: string[] = [];
let admHubId: string;

async function newUser() {
  const u = await prisma.user.create({
    data: {
      name: "Solicitante Teste",
      email: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
      status: "ACTIVE",
    },
  });
  createdUserIds.push(u.id);
  return u;
}

function startupPayload(name: string) {
  return buildStartupPayload({
    responsibleName: "Fulano",
    email: "fulano@test.local",
    phone: undefined,
    startupName: name,
    description: "Descrição suficiente para o teste de submissão.",
    stage: "HAVE_IDEA",
    city: "Campo Grande",
    state: "MS",
    website: undefined,
    acceptedTerms: true,
    acceptedPrivacy: true,
    companyWebsite: undefined,
  });
}

beforeAll(async () => {
  admHubId = (
    await prisma.user.findUniqueOrThrow({
      where: { email: "admhub@dev.hubdigital.local" },
    })
  ).id;
});

afterAll(async () => {
  const requests = await prisma.registrationRequest.findMany({
    where: { requesterId: { in: createdUserIds } },
  });
  const orgIds = requests
    .map((r) => r.resultingOrganizationId)
    .filter((v): v is string => Boolean(v));
  await prisma.registrationRequest.deleteMany({
    where: { requesterId: { in: createdUserIds } },
  });
  await prisma.auditLog.deleteMany({
    where: { actorId: { in: createdUserIds } },
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
  await prisma.notification.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("submissão", () => {
  it("cria STARTUP PENDING sem criar organização/vínculo, e audita", async () => {
    const user = await newUser();
    const { requestId } = await submitRegistrationRequest({
      type: "STARTUP",
      requesterId: user.id,
      payload: startupPayload("Startup Int"),
      actorOrganizationId: null,
    });

    const req = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(req.status).toBe("PENDING");
    expect(req.type).toBe("STARTUP");
    expect(req.requesterId).toBe(user.id);
    expect(req.resultingOrganizationId).toBeNull();
    expect(req.resultingMembershipId).toBeNull();

    // Nenhuma organização/vínculo antes da aprovação.
    expect(await prisma.membership.count({ where: { userId: user.id } })).toBe(
      0,
    );

    const audits = await prisma.auditLog.count({
      where: { actorId: user.id, action: "registration_request.submitted" },
    });
    expect(audits).toBe(1);
  });

  it("cria ESPACO_INOVACAO PENDING", async () => {
    const user = await newUser();
    const { requestId } = await submitRegistrationRequest({
      type: "ESPACO_INOVACAO",
      requesterId: user.id,
      payload: {
        organizationName: "Espaço Int",
        contactName: "F",
        contactEmail: "f@test.local",
      },
      actorOrganizationId: null,
    });
    const req = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(req.type).toBe("ESPACO_INOVACAO");
    expect(req.status).toBe("PENDING");
  });

  it("bloqueia segunda solicitação PENDENTE do mesmo tipo (duplicidade)", async () => {
    const user = await newUser();
    await submitRegistrationRequest({
      type: "STARTUP",
      requesterId: user.id,
      payload: startupPayload("Primeira"),
      actorOrganizationId: null,
    });
    await expect(
      submitRegistrationRequest({
        type: "STARTUP",
        requesterId: user.id,
        payload: startupPayload("Segunda"),
        actorOrganizationId: null,
      }),
    ).rejects.toBeInstanceOf(SubmissionConflictError);

    expect(
      await prisma.registrationRequest.count({
        where: { requesterId: user.id, type: "STARTUP" },
      }),
    ).toBe(1);
  });

  it("permite tipos distintos para o mesmo usuário", async () => {
    const user = await newUser();
    await submitRegistrationRequest({
      type: "STARTUP",
      requesterId: user.id,
      payload: startupPayload("ST"),
      actorOrganizationId: null,
    });
    await submitRegistrationRequest({
      type: "ESPACO_INOVACAO",
      requesterId: user.id,
      payload: {
        organizationName: "ESP",
        contactName: "F",
        contactEmail: "f@test.local",
      },
      actorOrganizationId: null,
    });
    expect(
      await prisma.registrationRequest.count({
        where: { requesterId: user.id },
      }),
    ).toBe(2);
  });

  it("submissões concorrentes: apenas uma cria (advisory lock)", async () => {
    const user = await newUser();
    const results = await Promise.allSettled([
      submitRegistrationRequest({
        type: "STARTUP",
        requesterId: user.id,
        payload: startupPayload("C1"),
        actorOrganizationId: null,
      }),
      submitRegistrationRequest({
        type: "STARTUP",
        requesterId: user.id,
        payload: startupPayload("C2"),
        actorOrganizationId: null,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await prisma.registrationRequest.count({
        where: { requesterId: user.id, type: "STARTUP" },
      }),
    ).toBe(1);
  });

  it("notifica administradores do Hub", async () => {
    const user = await newUser();
    const { notifiedAdmins } = await submitRegistrationRequest({
      type: "STARTUP",
      requesterId: user.id,
      payload: startupPayload("Notif"),
      actorOrganizationId: null,
    });
    expect(notifiedAdmins).toBeGreaterThanOrEqual(1);
    const admNotif = await prisma.notification.count({
      where: { userId: admHubId, type: "registration.submitted" },
    });
    expect(admNotif).toBeGreaterThanOrEqual(1);
    // Limpa as notificações geradas para o admHub (fora dos createdUserIds).
    await prisma.notification.deleteMany({
      where: { userId: admHubId, type: "registration.submitted" },
    });
  });
});

describe("isolamento e listagem", () => {
  it("usuário A não lê solicitações de B", async () => {
    const a = await newUser();
    const b = await newUser();
    await submitRegistrationRequest({
      type: "STARTUP",
      requesterId: a.id,
      payload: startupPayload("A"),
      actorOrganizationId: null,
    });
    const listB = await listMyRegistrationRequests(b.id);
    expect(listB).toHaveLength(0);
    const listA = await listMyRegistrationRequests(a.id);
    expect(listA).toHaveLength(1);
    expect(listA[0].requesterId).toBe(a.id);
  });
});

describe("compatibilidade com a aprovação", () => {
  it("solicitação pública → aprovação cria organização e vínculo ADM_STARTUP", async () => {
    const user = await newUser();
    const { requestId } = await submitRegistrationRequest({
      type: "STARTUP",
      requesterId: user.id,
      payload: startupPayload("Startup Ponta a Ponta"),
      actorOrganizationId: null,
    });

    // O payload público é aceito pelo schema de aprovação.
    const req = await prisma.registrationRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(parseRegistrationPayload(req.type, req.payload).ok).toBe(true);

    const result = await approveRegistrationRequest({
      requestId,
      actorId: admHubId,
      actorOrganizationId: null,
    });
    expect(result.organizationId).toBeTruthy();
    expect(result.membershipId).toBeTruthy();

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { id: result.membershipId! },
      include: { roles: { include: { role: true } } },
    });
    expect(membership.userId).toBe(user.id);
    expect(membership.roles.map((r) => r.role.code)).toContain("ADM_STARTUP");
  });
});
