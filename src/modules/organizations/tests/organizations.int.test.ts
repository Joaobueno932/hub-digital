/**
 * Testes de integração de edição/suspensão de organizações (PostgreSQL real).
 * Fixtures próprias, sem alterar dados do seed.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateOrganization } from "../services/update-organization";
import { suspendOrganization } from "../services/suspend-organization";
import { reactivateOrganization } from "../services/reactivate-organization";
import {
  OrganizationConflictError,
  OrganizationAlreadyInStatusError,
} from "../services/errors";
import { hasPermission } from "@/modules/permissions/services/authorization";

let admHubId: string;
let admStartupId: string;
let orgId: string;
const createdOrgIds: string[] = [];

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
  const startupType = await prisma.organizationType.findUniqueOrThrow({
    where: { code: "STARTUP" },
  });
  const org = await prisma.organization.create({
    data: {
      name: `Org Teste ${Date.now()}`,
      slug: `org-teste-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      typeId: startupType.id,
      status: "ACTIVE",
    },
  });
  orgId = org.id;
  createdOrgIds.push(org.id);
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: createdOrgIds } },
  });
  await prisma.notification.deleteMany({
    where: {
      userId: { in: [admHubId, admStartupId] },
      link: "/app/minha-organizacao",
    },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: createdOrgIds } },
  });
  await prisma.$disconnect();
});

describe("escopo de organizations.update", () => {
  it("ADM_HUB tem permissão global; ADM_STARTUP não tem sobre organização alheia", async () => {
    expect(await hasPermission(admHubId, orgId, "organizations.update")).toBe(
      true,
    );
    expect(
      await hasPermission(admStartupId, orgId, "organizations.update"),
    ).toBe(false);
  });
});

describe("updateOrganization", () => {
  it("edita campos permitidos e audita antes/depois", async () => {
    const before = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    const updated = await updateOrganization({
      organizationId: orgId,
      actorId: admHubId,
      data: {
        name: "Novo Nome",
        displayName: "Nome de Exibição",
        description: "Descrição atualizada",
        website: "https://example.com",
        city: "Campo Grande",
        state: "MS",
      },
      expectedUpdatedAt: before.updatedAt,
    });
    expect(updated.name).toBe("Novo Nome");
    expect(updated.city).toBe("Campo Grande");

    const audits = await prisma.auditLog.findMany({
      where: { entityId: orgId, action: "organization.updated" },
    });
    expect(audits.length).toBe(1);
  });

  it("edição concorrente (updatedAt divergente) é rejeitada e nada é persistido", async () => {
    const current = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    const stale = new Date(current.updatedAt.getTime() - 60_000);

    await expect(
      updateOrganization({
        organizationId: orgId,
        actorId: admHubId,
        data: {
          name: "Nome Perdido",
          displayName: null,
          description: null,
          website: null,
          city: null,
          state: null,
        },
        expectedUpdatedAt: stale,
      }),
    ).rejects.toBeInstanceOf(OrganizationConflictError);

    const unchanged = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    expect(unchanged.name).not.toBe("Nome Perdido");
  });
});

describe("suspensão e reativação", () => {
  it("suspende, impede uso como organização ativa e permite reativar", async () => {
    await suspendOrganization({ organizationId: orgId, actorId: admHubId });
    const suspended = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    expect(suspended.status).toBe("SUSPENDED");

    await expect(
      suspendOrganization({ organizationId: orgId, actorId: admHubId }),
    ).rejects.toBeInstanceOf(OrganizationAlreadyInStatusError);

    await reactivateOrganization({ organizationId: orgId, actorId: admHubId });
    const reactivated = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    expect(reactivated.status).toBe("ACTIVE");

    const audits = await prisma.auditLog.findMany({
      where: {
        entityId: orgId,
        action: { in: ["organization.suspended", "organization.reactivated"] },
      },
    });
    expect(audits.length).toBe(2);
  });
});
