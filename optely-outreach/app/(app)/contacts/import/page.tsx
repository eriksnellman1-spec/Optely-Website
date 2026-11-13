import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ClearTestData, ImportWizard } from "@/components/import/import-wizard";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Importera bolag" };

export default async function ImportPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("test_data_counts");
  const counts = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const companies = typeof counts.companies === "number" ? counts.companies : 0;
  const partners = typeof counts.partners === "number" ? counts.partners : 0;

  return (
    <div className="space-y-5">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Företag
      </Link>
      <PageHeader
        title="Importera bolag"
        description="Ringlistan in i registret: kolumnval, dubblettkontroll mot alla kanaler och partner, och erbjudande utifrån bransch."
      />
      {companies + partners > 0 && <ClearTestData companies={companies} partners={partners} />}
      <ImportWizard />
    </div>
  );
}
