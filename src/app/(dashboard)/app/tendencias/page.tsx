import type { Metadata } from "next";
import { requireFeature } from "@/lib/authz";
import { ModulePlaceholder } from "@/modules/feature-flags/components/module-placeholder";

export const metadata: Metadata = { title: "Tendências e Negócios" };

export default async function TendenciasPage() {
  // Flag desligada → /app/modulo-indisponivel. Ocultar no menu não basta.
  await requireFeature("trends");
  return <ModulePlaceholder flagKey="trends" />;
}
