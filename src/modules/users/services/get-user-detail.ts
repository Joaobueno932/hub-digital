import { prisma } from "@/lib/prisma";

/**
 * Detalhe administrativo do usuário.
 *
 * Usa `select` explícito em vez de `include` amplo justamente para garantir
 * que `passwordHash`, `accounts`, `sessions` e qualquer token jamais sejam
 * carregados — nem por engano, nem em mudanças futuras do modelo.
 */
export async function getUserDetail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      suspendedAt: true,
      suspensionReason: true,
      suspendedBy: { select: { id: true, name: true, email: true } },
      memberships: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              type: { select: { code: true, name: true } },
            },
          },
          roles: { select: { role: { select: { code: true, name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      onboarding: {
        select: { status: true, selectedStage: true, completedAt: true },
      },
      registrationRequests: {
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          decidedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      notifications: {
        select: {
          id: true,
          type: true,
          title: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!user) return null;

  // Auditoria relacionada: eventos sobre o usuário + eventos praticados por ele.
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [{ entityType: "user", entityId: user.id }, { actorId: user.id }],
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      createdAt: true,
      actor: { select: { name: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { user, auditLogs };
}
