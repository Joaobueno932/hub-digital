"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ACTIVE_ORG_COOKIE, requireSessionContext } from "@/lib/authz";

const switchSchema = z.object({
  organizationId: z.uuid(),
});

/**
 * Troca a organização ativa.
 * 1. autenticação; 2. o ID enviado precisa corresponder a um vínculo válido do
 * próprio usuário (nunca confiamos no valor do formulário); 3. persiste em
 * cookie httpOnly; 4. audita; 5. invalida cache e redireciona para /app.
 */
export async function switchOrganizationAction(
  formData: FormData,
): Promise<void> {
  const ctx = await requireSessionContext();

  const parsed = switchSchema.safeParse({
    organizationId: formData.get("organizationId"),
  });
  if (!parsed.success) redirect("/app");

  const membership = ctx.access.memberships.find(
    (m) => m.organizationId === parsed.data.organizationId,
  );
  if (!membership) {
    // Tentativa de selecionar organização sem vínculo: nega sem vazar detalhes.
    redirect("/app/acesso-negado");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, membership.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await prisma.auditLog.create({
    data: {
      actorId: ctx.user.id,
      organizationId: membership.organizationId,
      action: "organization.switched",
      entityType: "organization",
      entityId: membership.organizationId,
    },
  });

  revalidatePath("/app", "layout");
  redirect("/app");
}
