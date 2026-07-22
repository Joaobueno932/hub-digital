import type { Prisma } from "@/generated/prisma/client";
import { adminRoleForOrgType } from "../config/role-matrix";
import { LastAdminError } from "./errors";

type TxClient = Prisma.TransactionClient;

/**
 * Garante que a organização continue com ao menos um administrador ativo
 * após a operação, excluindo o vínculo `membershipIdToExclude` da contagem
 * (a remoção/suspensão/rebaixamento em curso ainda não foi persistida).
 *
 * Deve ser chamada dentro da mesma transação da mutação, antes de gravar.
 */
export async function assertNotLastActiveAdmin(
  tx: TxClient,
  organizationId: string,
  membershipIdToExclude: string,
): Promise<void> {
  const org = await tx.organization.findUniqueOrThrow({
    where: { id: organizationId },
    include: { type: true },
  });
  const adminRole = adminRoleForOrgType(org.type.code);
  if (!adminRole) return; // Tipo sem papel administrador definido — nada a proteger.

  const remainingAdmins = await tx.membership.count({
    where: {
      organizationId,
      status: "ACTIVE",
      deletedAt: null,
      id: { not: membershipIdToExclude },
      roles: { some: { role: { code: adminRole } } },
    },
  });

  if (remainingAdmins === 0) throw new LastAdminError();
}
