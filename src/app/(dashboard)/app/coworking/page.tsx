import type { Metadata } from "next";
import { requireFeature } from "@/lib/authz";
import { ModulePlaceholder } from "@/modules/feature-flags/components/module-placeholder";

export const metadata: Metadata = { title: "Coworking" };

export default async function CoworkingPage() {
  // Flag desligada → /app/modulo-indisponivel. Ocultar no menu não basta.
  await requireFeature("coworking");
  return <ModulePlaceholder flagKey="coworking" />;
}
