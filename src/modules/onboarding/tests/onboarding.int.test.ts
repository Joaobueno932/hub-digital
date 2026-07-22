/**
 * Testes de integração do onboarding (PostgreSQL real do Docker).
 * Cada teste cria seu próprio usuário e limpa ao final — sem mock de banco.
 */
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveOnboardingDraft } from "../services/save-onboarding-draft";
import { completeOnboarding } from "../services/complete-onboarding";
import {
  getOnboardingProfile,
  getOnboardingState,
} from "../services/get-onboarding-profile";
import { resolvePostLoginRedirect } from "../services/resolve-post-login-redirect";
import {
  OnboardingAlreadyCompletedError,
  OnboardingCompletionConflictError,
  OnboardingNotReadyError,
} from "../services/errors";

const createdUserIds: string[] = [];

async function newUser() {
  const user = await prisma.user.create({
    data: {
      name: "Onboarding Teste",
      email: `onb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
      status: "ACTIVE",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { actorId: { in: createdUserIds } },
  });
  await prisma.notification.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.onboardingProfile.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("rascunho", () => {
  it("cria DRAFT e audita started + draft_saved", async () => {
    const user = await newUser();
    await saveOnboardingDraft({ userId: user.id, selectedStage: "HAVE_IDEA" });

    const profile = await getOnboardingProfile(user.id);
    expect(profile?.status).toBe("DRAFT");
    expect(profile?.selectedStage).toBe("HAVE_IDEA");
    expect(await getOnboardingState(user.id)).toBe("DRAFT");

    const started = await prisma.auditLog.count({
      where: { actorId: user.id, action: "onboarding.started" },
    });
    const saved = await prisma.auditLog.count({
      where: { actorId: user.id, action: "onboarding.draft_saved" },
    });
    expect(started).toBe(1);
    expect(saved).toBe(1);
  });

  it("atualiza DRAFT (retomada) sem novo started e incrementa a versão", async () => {
    const user = await newUser();
    await saveOnboardingDraft({ userId: user.id, selectedStage: "HAVE_IDEA" });
    await saveOnboardingDraft({
      userId: user.id,
      selectedStage: "HAVE_IDEA_AND_TEAM",
    });

    const profile = await getOnboardingProfile(user.id);
    expect(profile?.selectedStage).toBe("HAVE_IDEA_AND_TEAM");
    expect(profile?.version).toBe(1);

    const started = await prisma.auditLog.count({
      where: { actorId: user.id, action: "onboarding.started" },
    });
    expect(started).toBe(1);
  });
});

describe("conclusão", () => {
  it("conclui rascunho válido: notificação e auditoria únicas", async () => {
    const user = await newUser();
    await saveOnboardingDraft({
      userId: user.id,
      selectedStage: "WANT_TO_START",
    });
    await completeOnboarding({ userId: user.id });

    const profile = await getOnboardingProfile(user.id);
    expect(profile?.status).toBe("COMPLETED");
    expect(profile?.completedAt).not.toBeNull();

    expect(
      await prisma.notification.count({
        where: { userId: user.id, type: "onboarding.completed" },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { actorId: user.id, action: "onboarding.completed" },
      }),
    ).toBe(1);
  });

  it("conclusão sem rascunho lança OnboardingNotReadyError", async () => {
    const user = await newUser();
    await expect(
      completeOnboarding({ userId: user.id }),
    ).rejects.toBeInstanceOf(OnboardingNotReadyError);
  });

  it("segunda conclusão é conflito e não duplica notificação/auditoria nem altera completedAt", async () => {
    const user = await newUser();
    await saveOnboardingDraft({ userId: user.id, selectedStage: "HAVE_IDEA" });
    await completeOnboarding({ userId: user.id });
    const first = await getOnboardingProfile(user.id);

    await expect(
      completeOnboarding({ userId: user.id }),
    ).rejects.toBeInstanceOf(OnboardingCompletionConflictError);

    const after = await getOnboardingProfile(user.id);
    expect(after?.completedAt?.getTime()).toBe(first?.completedAt?.getTime());
    expect(
      await prisma.notification.count({
        where: { userId: user.id, type: "onboarding.completed" },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { actorId: user.id, action: "onboarding.completed" },
      }),
    ).toBe(1);
  });

  it("conclusões concorrentes: apenas uma processa", async () => {
    const user = await newUser();
    await saveOnboardingDraft({ userId: user.id, selectedStage: "HAVE_IDEA" });

    const results = await Promise.allSettled([
      completeOnboarding({ userId: user.id }),
      completeOnboarding({ userId: user.id }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await prisma.notification.count({
        where: { userId: user.id, type: "onboarding.completed" },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: { actorId: user.id, action: "onboarding.completed" },
      }),
    ).toBe(1);
  });

  it("não sobrescreve COMPLETED ao salvar rascunho novamente", async () => {
    const user = await newUser();
    await saveOnboardingDraft({ userId: user.id, selectedStage: "HAVE_IDEA" });
    await completeOnboarding({ userId: user.id });

    await expect(
      saveOnboardingDraft({ userId: user.id, selectedStage: "WANT_TO_START" }),
    ).rejects.toBeInstanceOf(OnboardingAlreadyCompletedError);

    const profile = await getOnboardingProfile(user.id);
    expect(profile?.selectedStage).toBe("HAVE_IDEA"); // inalterado
  });
});

describe("isolamento e IDOR", () => {
  it("o fluxo sempre usa o userId informado (da sessão), nunca o de outro usuário", async () => {
    const userA = await newUser();
    const userB = await newUser();
    await saveOnboardingDraft({ userId: userA.id, selectedStage: "HAVE_IDEA" });

    // Operar como B nunca toca o onboarding de A.
    await saveOnboardingDraft({
      userId: userB.id,
      selectedStage: "WANT_TO_START",
    });
    await completeOnboarding({ userId: userB.id });

    const a = await getOnboardingProfile(userA.id);
    const b = await getOnboardingProfile(userB.id);
    expect(a?.status).toBe("DRAFT");
    expect(a?.selectedStage).toBe("HAVE_IDEA");
    expect(b?.status).toBe("COMPLETED");
    expect(b?.userId).not.toBe(a?.userId);
  });

  it("getOnboardingProfile lê apenas o próprio registro", async () => {
    const userA = await newUser();
    const userB = await newUser();
    await saveOnboardingDraft({ userId: userA.id, selectedStage: "HAVE_IDEA" });

    expect(await getOnboardingProfile(userB.id)).toBeNull();
    expect((await getOnboardingProfile(userA.id))?.userId).toBe(userA.id);
  });
});

describe("independência de organização", () => {
  it("usuário sem vínculo conclui o onboarding e o redirecionamento reflete o estado", async () => {
    const user = await newUser();
    const memberships = await prisma.membership.count({
      where: { userId: user.id },
    });
    expect(memberships).toBe(0);

    expect(await resolvePostLoginRedirect(user.id)).toBe("/app/onboarding");
    await saveOnboardingDraft({ userId: user.id, selectedStage: "HAVE_IDEA" });
    expect(await resolvePostLoginRedirect(user.id)).toBe("/app/onboarding");
    await completeOnboarding({ userId: user.id });
    expect(await resolvePostLoginRedirect(user.id)).toBe("/app");

    // O fluxo não criou vínculo nem organização.
    expect(await prisma.membership.count({ where: { userId: user.id } })).toBe(
      0,
    );
  });
});
