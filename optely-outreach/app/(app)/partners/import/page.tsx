import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PartnerImportWizard } from "@/components/import/partner-import-wizard";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Importera partner" };

export default function PartnerImportPage() {
  return (
    <div className="space-y-5">
      <Link href="/partners" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Partner
      </Link>
      <PageHeader
        title="Importera partner"
        description="Partnerlistan in i appen: kolumnval, partnertyp och dubblettkontroll mot befintliga partner."
      />
      <PartnerImportWizard />
    </div>
  );
}
