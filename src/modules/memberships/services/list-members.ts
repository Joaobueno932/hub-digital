import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 20;

export async function listOrganizationMembers(input: {
  organizationId: string;
  search?: string;
  roleCode?: string;
  status?: "ACTIVE" | "SUSPENDED";
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const where: Prisma.MembershipWhereInput = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: input.status ?? { in: ["ACTIVE", "SUSPENDED"] },
    ...(input.search
      ? {
          user: {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...(input.roleCode
      ? { roles: { some: { role: { code: input.roleCode } } } }
      : {}),
  };

  const [members, total] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.membership.count({ where }),
  ]);

  return {
    members,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
