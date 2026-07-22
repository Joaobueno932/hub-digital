import type { Metadata } from "next";
import { requireFeature } from "@/lib/authz";
import { ModulePlaceholder } from "@/modules/feature-flags/components/module-placeholder";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  // Flag desligada → /app/modulo-indisponivel. Ocultar no menu não basta.
  await requireFeature("agenda");
  return <ModulePlaceholder flagKey="agenda" />;
}
