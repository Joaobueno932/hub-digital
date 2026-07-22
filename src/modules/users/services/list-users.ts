import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { UserStatus } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

/**
 * Listagem administrativa de usuários da plataforma.
 *
 * `select` explícito: `passwordHash`, tokens e sessões nunca saem daqui.
 * Não há coluna de "último acesso" — o modelo não registra login (ver
 * docs/pendencias-negocio.md).
 */
export async function listUsers(input: {
  search?: string;
  status?: string;
  roleCode?: string;
  organizationId?: string;
  page?: number;
  sort?: "name" | "createdAt";
}) {
  const page = Math.max(1, input.page ?? 1);

  const membershipFilter: Prisma.MembershipWhereInput | undefined =
    input.roleCode || input.organizationId
      ? {
          status: "ACTIVE",
          deletedAt: null,
          ...(input.organizationId
            ? { organizationId: input.organizationId }
            : {}),
          ...(input.roleCode
            ? { roles: { some: { role: { code: input.roleCode } } } }
            : {}),
        }
      : undefined;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(input.status ? { status: input.status as UserStatus } : {}),
    ...(membershipFilter ? { memberships: { some: membershipFilter } } : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    input.sort === "name" ? { name: "asc" } : { createdAt: "desc" };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        emailVerified: true,
        _count: {
          select: {
            memberships: { where: { status: "ACTIVE", deletedAt: null } },
          },
        },
      },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
