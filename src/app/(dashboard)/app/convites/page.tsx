import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";
import { listOrganizationInvitations } from "@/modules/invitations/services/list-invitations";
import {
  InvitationsPanel,
  type InvitationRow,
} from "@/modules/invitations/components/invitations-panel";

export const metadata: Metadata = { title: "Convites" };

export default async function ConvitesPage() {
  const ctx = await requirePermission("invitations.manage");
  if (!ctx.activeMembership) redirect("/app/sem-organizacao");

  const invitations = await listOrganizationInvitations(
    ctx.activeMembership.organizationId,
  );

  const rows: InvitationRow[] = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    roleName: inv.role.name,
    status: inv.status,
    invitedByName: inv.invitedBy.name,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString(),
  }));

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Convites</h1>
      <p className="mt-1 text-sm text-muted">
        Convites enviados por {ctx.activeMembership.organization.name}. Novos
        convites são criados em{" "}
        <a
          href="/app/membros"
          className="text-primary underline-offset-2 hover:underline"
        >
          Membros
        </a>
        .
      </p>
      <InvitationsPanel invitations={rows} />
    </>
  );
}
