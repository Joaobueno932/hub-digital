import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermissionForOrganization } from "@/lib/authz";
import { hasPermission as hasPermissionForOrg } from "@/modules/permissions/services/authorization";
import { prisma } from "@/lib/prisma";
import { listOrganizationMembers } from "@/modules/memberships/services/list-members";
import { ALLOWED_ROLES_BY_ORG_TYPE } from "@/modules/memberships/config/role-matrix";
import {
  MembersPanel,
  type MemberRow,
} from "@/modules/memberships/components/members-panel";

export const metadata: Metadata = { title: "Membros da organização" };

export default async function AdminOrganizacaoMembrosPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { organizationId } = await params;
  if (!z.uuid().safeParse(organizationId).success) notFound();

  const ctx = await requirePermissionForOrganization(
    "members.manage",
    organizationId,
  );
  const sp = await searchParams;

  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    include: { type: true },
  });
  if (!organization) notFound();

  const status =
    sp.status === "SUSPENDED" || sp.status === "ACTIVE" ? sp.status : undefined;

  const { members, total } = await listOrganizationMembers({
    organizationId,
    search: sp.q,
    roleCode: sp.role,
    status,
    page: sp.page ? Number(sp.page) : 1,
  });

  const allowedRoleCodes =
    ALLOWED_ROLES_BY_ORG_TYPE[organization.type.code] ?? [];
  const assignableRoles = await prisma.role.findMany({
    where: { code: { in: allowedRoleCodes } },
  });

  const canInvite =
    ctx.access.superAdmin ||
    ctx.access.global.has("invitations.manage") ||
    (await hasPermissionForOrg(
      ctx.user.id,
      organizationId,
      "invitations.manage",
    ));

  const rows: MemberRow[] = members.map((m) => ({
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    roleCodes: m.roles.map((r) => r.role.code),
    roleNames: m.roles.map((r) => r.role.name),
    status: m.status as "ACTIVE" | "SUSPENDED",
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <>
      <Link
        href={`/app/admin/organizacoes/${organizationId}`}
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← Voltar para {organization.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-primary">
        Membros — {organization.name}
      </h1>
      <p className="mt-1 text-sm text-muted">{total} membro(s) no total.</p>

      <MembersPanel
        organizationId={organizationId}
        members={rows}
        assignableRoles={assignableRoles}
        canInvite={canInvite}
      />
    </>
  );
}
