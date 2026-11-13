import type { Metadata } from "next";
import Link from "next/link";
import { FileUp, Handshake } from "lucide-react";

import { SwitchToOfferButton } from "@/components/offer/switch-to-button";
import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PartnerTable } from "@/components/partners/partner-table";
import { getOfferFilter } from "@/lib/offer-server";
import type { SearchParams } from "@/lib/page-types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Partner" };

export default async function PartnersPage({ searchParams }: { searchParams: SearchParams }) {
  const offer = await getOfferFilter(searchParams);

  if (offer === "sba") {
    return (
      <div className="space-y-5">
        <PageHeader title="Partner" description="Partnernätverket gäller bara Optely." />
        <EmptyState
          icon={Handshake}
          title="Partner gäller bara Optely"
          description="SBA säljs direkt till hantverkare. Byt växeln till Optely eller Alla för att se partnerna."
          action={<SwitchToOfferButton offer="optely" />}
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [partnersRes, dueRes, referredRes] = await Promise.all([
    supabase.from("partners").select("*").order("name"),
    supabase.from("partners_due").select("id"),
    supabase.from("companies").select("partner_id").not("partner_id", "is", null),
  ]);
  if (partnersRes.error) throw new Error("Kunde inte läsa partnerna.");

  const due = new Set((dueRes.data ?? []).map((d) => d.id));
  const referred = new Map<string, number>();
  for (const r of referredRes.data ?? []) {
    if (r.partner_id) referred.set(r.partner_id, (referred.get(r.partner_id) ?? 0) + 1);
  }
  const partners = [...partnersRes.data].sort((a, b) => Number(due.has(b.id)) - Number(due.has(a.id)));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Partner"
        description={
          <>
            <span className="font-mono tabular-nums">{partners.length}</span> partner ·{" "}
            <span className="font-mono tabular-nums">{due.size}</span> behöver höras · bara Optely
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/partners/import">
                <FileUp /> Importera CSV
              </Link>
            </Button>
            <OpenDialogButton dialog="partner-checkin" size="sm">
              <Handshake /> Logga check-in
            </OpenDialogButton>
          </>
        }
      />

      {partners.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Inga partner än"
          description="Bokföringsbyråer, IT-byråer och reklam-/webbyråer som kan tipsa om kunder. Importera partnerlistan som CSV."
          action={
            <Button asChild>
              <Link href="/partners/import">
                <FileUp /> Importera partner
              </Link>
            </Button>
          }
        />
      ) : (
        <PartnerTable
          partners={partners.map((p) => ({ ...p, due: due.has(p.id), referred: referred.get(p.id) ?? 0 }))}
        />
      )}
    </div>
  );
}
