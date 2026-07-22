import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { OrganizationStatus } from "@/generated/prisma/enums";

const PAGE_SIZE = 20;

export async function listOrganizations(input: {
  search?: string;
  typeCode?: string;
  status?: string;
  page?: number;
  sort?: "name" | "createdAt";
}) {
  const page = Math.max(1, input.page ?? 1);
  const where: Prisma.OrganizationWhereInput = {
    deletedAt: null,
    ...(input.search
      ? { name: { contains: input.search, mode: "insensitive" } }
      : {}),
    ...(input.typeCode ? { type: { code: input.typeCode } } : {}),
    ...(input.status ? { status: input.status as OrganizationStatus } : {}),
  };

  const orderBy: Prisma.OrganizationOrderByWithRelationInput =
    input.sort === "name" ? { name: "asc" } : { createdAt: "desc" };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      include: { type: true, _count: { select: { memberships: true } } },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
