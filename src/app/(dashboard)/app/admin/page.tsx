import type { Metadata } from "next";
import Link from "next/link";
import { requireAnyPermission, hasPermission } from "@/lib/authz";

export const metadata: Metadata = { title: "Administração" };

export const ADMIN_PERMISSIONS = [
  "users.list",
  "organizations.list",
  "registrations.list",
  "roles.manage",
  "permissions.manage",
  "audit.view",
  "feature-flags.manage",
];

const SECTIONS = [
  { href: "/app/admin/usuarios", label: "Usuários", permission: "users.list" },
  {
    href: "/app/admin/organizacoes",
    label: "Organizações",
    permission: "organizations.list",
  },
  {
    href: "/app/admin/cadastros",
    label: "Solicitações de cadastro",
    permission: "registrations.list",
  },
  { href: "/app/admin/perfis", label: "Perfis", permission: "roles.manage" },
  {
    href: "/app/admin/permissoes",
    label: "Permissões",
    permission: "permissions.manage",
  },
  {
    href: "/app/admin/auditoria",
    label: "Auditoria",
    permission: "audit.view",
  },
];

export default async function AdminPage() {
  await requireAnyPermission(ADMIN_PERMISSIONS);

  const visible = (
    await Promise.all(
      SECTIONS.map(async (s) =>
        (await hasPermission(s.permission)) ? s : null,
      ),
    )
  ).filter((s) => s !== null);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">Administração</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl bg-surface p-5 font-semibold text-primary shadow-sm hover:shadow"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </>
  );
}
