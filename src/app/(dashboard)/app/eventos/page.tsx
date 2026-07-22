import type { Metadata } from "next";
import { requireFeature } from "@/lib/authz";
import { ModulePlaceholder } from "@/modules/feature-flags/components/module-placeholder";

export const metadata: Metadata = { title: "Eventos" };

export default async function EventosPage() {
  // Flag desligada → /app/modulo-indisponivel. Ocultar no menu não basta.
  await requireFeature("events");
  return <ModulePlaceholder flagKey="events" />;
}
