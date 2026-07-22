import type { Prisma } from "@/generated/prisma/client";

/**
 * Notifica administradores do Hub sobre uma nova solicitação.
 *
 * Destinatários: membros ativos de organização do tipo HUB com papel ADM_HUB
 * ou SUPER_ADMIN. São poucos administradores — uma notificação por admin, sem
 * volume massivo. Recebe um cliente de transação para atomicidade.
 */
export async function notifyRegistrationAdmins(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const admins = await tx.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      memberships: {
        some: {
          status: "ACTIVE",
          deletedAt: null,
          organization: {
            type: { code: "HUB" },
            status: "ACTIVE",
            deletedAt: null,
          },
          roles: {
            some: { role: { code: { in: ["ADM_HUB", "SUPER_ADMIN"] } } },
          },
        },
      },
    },
    select: { id: true },
  });

  if (admins.length === 0) return 0;

  await tx.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "registration.submitted",
      title: "Nova solicitação de cadastro",
      body: "Uma nova solicitação institucional aguarda análise.",
      link: "/app/admin/cadastros",
    })),
  });

  return admins.length;
}
