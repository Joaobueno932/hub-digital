import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  RegistrationStatus,
  RegistrationType,
} from "@/generated/prisma/enums";

/** Consulta administrativa de solicitações (escopo global: ADM_HUB/SUPER_ADMIN). */

export type ListFilters = {
  q?: string;
  status?: RegistrationStatus;
  type?: RegistrationType;
  page?: number;
  pageSize?: number;
};

export async function listRegistrationRequests(filters: ListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10));

  const where: Prisma.RegistrationRequestWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.q
      ? {
          OR: [
            {
              requester: { name: { contains: filters.q, mode: "insensitive" } },
            },
            {
              requester: {
                email: { contains: filters.q, mode: "insensitive" },
              },
            },
            // Busca no payload por nome de organização (JSONB).
            {
              payload: {
                path: ["organizationName"],
                string_contains: filters.q,
              },
            },
            { payload: { path: ["contactEmail"], string_contains: filters.q } },
          ],
        }
      : {}),
  };

  const [total, items, summary] = await Promise.all([
    prisma.registrationRequest.count({ where }),
    prisma.registrationRequest.findMany({
      where,
      include: { requester: true, decidedBy: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.registrationRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: Object.fromEntries(
      summary.map((s) => [s.status, s._count._all]),
    ) as Record<string, number>,
  };
}

export async function getRegistrationRequest(id: string) {
  return prisma.registrationRequest.findUnique({
    where: { id },
    include: {
      requester: true,
      decidedBy: true,
      resultingOrganization: true,
      previousRequest: true,
      resubmission: true,
    },
  });
}
