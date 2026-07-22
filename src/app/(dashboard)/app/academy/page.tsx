import type { Metadata } from "next";
import { requireFeature } from "@/lib/authz";
import { ModulePlaceholder } from "@/modules/feature-flags/components/module-placeholder";

export const metadata: Metadata = { title: "Academy" };

export default async function AcademyPage() {
  // Flag desligada → /app/modulo-indisponivel. Ocultar no menu não basta.
  await requireFeature("academy");
  return <ModulePlaceholder flagKey="academy" />;
}
