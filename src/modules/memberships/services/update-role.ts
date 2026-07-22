import { prisma } from "@/lib/prisma";
import {
  adminRoleForOrgType,
  bestAuthorityRank,
  isRoleAllowedForOrgType,
  roleAuthorityRank,
  SUPER_ADMIN_ROLE,
} from "../config/role-matrix";
import { assertNotLastActiveAdmin } from "./guard-last-admin";
import {
  MembershipConflictError,
  MembershipNotFoundError,
  RoleNotAllowedError,
  SelfElevationError,
} from "./errors";

/**
 * Troca o papel de um membership (modelo atual: um papel por vínculo, como já
 * praticado pelo seed e pelos fluxos de aprovação existentes).
 *
 * Regras de autoridade: o ator só pode atribuir um papel que ele próprio
 * poderia ter naquele tipo de organização (nunca um papel de autoridade
 * maior que a sua própria ali) e nunca SUPER_ADMIN — isso é reforçado tanto
 * para terceiros quanto para autoelevação do próprio ator.
 */
export async function updateMembershipRole(input: {
  membershipId: string;
  newRoleCode: string;
  actorId: string;
  actorIsSuperAdmin: boolean;
  actorRoleCodesInOrg: string[];
}) {
  const membership = await prisma.membership.findFirst({
    where: { id: input.membershipId, deletedAt: null },
    include: {
      organization: { include: { type: true } },
      roles: { include: { role: true } },
    },
  });
  if (!membership) throw new MembershipNotFoundError();

  const orgTypeCode = membership.organization.type.code;

  if (input.newRoleCode === SUPER_ADMIN_ROLE && !input.actorIsSuperAdmin) {
    throw new RoleNotAllowedError();
  }
  if (
    input.newRoleCode !== SUPER_ADMIN_ROLE &&
    !isRoleAllowedForOrgType(orgTypeCode, input.newRoleCode)
  ) {
    throw new RoleNotAllowedError();
  }
  if (!input.actorIsSuperAdmin) {
    // Autoridade por posição no tipo de organização (índice 0 = maior
    // autoridade): o ator só pode conceder papéis na sua posição ou abaixo —
    // nunca um papel de autoridade maior que a própria.
    const actorRank = bestAuthorityRank(orgTypeCode, input.actorRoleCodesInOrg);
    const targetRank = roleAuthorityRank(orgTypeCode, input.newRoleCode);
    if (actorRank === null || targetRank === null || targetRank < actorRank) {
      throw new SelfElevationError();
    }
  }

  const previousRoleCodes = membership.roles.map((r) => r.role.code);
  const adminRole = adminRoleForOrgType(orgTypeCode);
  const wasAdmin = adminRole ? previousRoleCodes.includes(adminRole) : false;
  const willBeAdmin = input.newRoleCode === adminRole;

  const newRole = await prisma.role.findUniqueOrThrow({
    where: { code: input.newRoleCode },
  });

  return prisma.$transaction(async (tx) => {
    // OCC leve: garante que o vínculo ainda está ACTIVE ao aplicar a troca.
    const claimed = await tx.membership.updateMany({
      where: { id: membership.id, status: "ACTIVE" },
      data: {},
    });
    if (claimed.count === 0) throw new MembershipConflictError();

    if (wasAdmin && !willBeAdmin) {
      await assertNotLastActiveAdmin(
        tx,
        membership.organizationId,
        membership.id,
      );
    }

    await tx.membershipRole.deleteMany({
      where: { membershipId: membership.id },
    });
    await tx.membershipRole.create({
      data: {
        membershipId: membership.id,
        roleId: newRole.id,
        assignedById: input.actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        organizationId: membership.organizationId,
        action: "membership.role_updated",
        entityType: "membership",
        entityId: membership.id,
        metadata: {
          previousRoles: previousRoleCodes,
          newRoles: [input.newRoleCode],
        },
      },
    });

    await tx.notification.create({
      data: {
        userId: membership.userId,
        type: "membership.role_updated",
        title: "Seu papel foi alterado",
        body: `Seu papel em ${membership.organization.name} agora é ${newRole.name}.`,
        link: "/app/membros",
      },
    });

    return tx.membership.findUniqueOrThrow({ where: { id: membership.id } });
  });
}
