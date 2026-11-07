import type { Metadata } from "next";

import { BrainEditor } from "@/components/brain/brain-editor";
import { OfferTabs } from "@/components/offer/offer-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { OFFER_LABEL, offersFor, type Offer } from "@/lib/offer";
import { getOfferFilter } from "@/lib/offer-server";
import type { SearchParams } from "@/lib/page-types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Manus och sekvenser" };

export default async function ScriptsPage({ searchParams }: { searchParams: SearchParams }) {
  const filter = await getOfferFilter(searchParams);
  const params = await searchParams;
  const tabs = offersFor(filter);
  const requested = params.tab === "optely" || params.tab === "sba" ? (params.tab as Offer) : null;
  const tab: Offer = requested && tabs.includes(requested) ? requested : tabs[0];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("context_entries")
    .select("*")
    .in("kind", ["script", "objection", "sequence"])
    .or(`offer.eq.${tab},offer.is.null`)
    .order("kind")
    .order("sort_order");
  if (error) throw new Error("Kunde inte läsa manus och sekvenser.");
  const entries = (data ?? []).filter((e) => e.offer === null || e.offer === tab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manus och sekvenser"
        description={`${OFFER_LABEL[tab]}: samtalsmanus, invändningar och e-postsekvens. Spara med ⌘S.`}
        actions={<OfferTabs tabs={tabs} active={tab} basePath="/scripts" />}
      />
      <BrainEditor
        key={tab}
        entries={entries}
        initialId={typeof params.id === "string" ? params.id : null}
        offer={tab}
        defaultKind="script"
      />
    </div>
  );
}
