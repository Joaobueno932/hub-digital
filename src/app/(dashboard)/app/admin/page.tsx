import type { Metadata } from "next";
import Link from "next/link";
import { requireAnyGlobalPermission, hasGlobalPermission } from "@/lib/authz";

export const metadata: Metadata = { title: "Administração" };

// Não exportar de um arquivo de página (o type-check do build webpack rejeita
// exports que não sejam os do contrato de página).
const ADMIN_PERMISSIONS = [
  "users.list",
  "organizations.list",
  "registrations.list",
  "roles.manage",
  "permissions.manage",
  "audit.view",
  "feature-flags.list",
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
  {
    href: "/app/admin/feature-flags",
    label: "Feature flags",
    permission: "feature-flags.list",
  },
];

export default async function AdminPage() {
  // Todo o /app/admin opera sobre dados de todas as organizações, então exige
  // escopo global — não basta ter a permissão dentro de uma organização.
  await requireAnyGlobalPermission(ADMIN_PERMISSIONS);

  const visible = (
    await Promise.all(
      SECTIONS.map(async (s) =>
        (await hasGlobalPermission(s.permission)) ? s : null,
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
