import type { Metadata } from "next";
import { Users } from "lucide-react";

import { OptelyCustomerRow, SbaCustomerRow } from "@/components/customers/customer-rows";
import { OfferTabs } from "@/components/offer/offer-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { offersFor, type Offer } from "@/lib/offer";
import { getOfferFilter } from "@/lib/offer-server";
import type { SearchParams } from "@/lib/page-types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kunder" };

function monthStarts() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  const [y, m] = parts;
  const thisMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const lastMonth = `${prev.y}-${String(prev.m).padStart(2, "0")}-01`;
  return { thisMonth, lastMonth };
}

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const filter = await getOfferFilter(searchParams);
  const params = await searchParams;
  const tabs = offersFor(filter);
  const requested = params.tab === "optely" || params.tab === "sba" ? (params.tab as Offer) : null;
  const tab: Offer = requested && tabs.includes(requested) ? requested : tabs[0];
  const supabase = await createClient();
  const { thisMonth, lastMonth } = monthStarts();

  const companiesRes = await supabase
    .from("companies")
    .select("id, name, city")
    .eq("status", "customer")
    .eq("offer", tab)
    .order("name");
  if (companiesRes.error) throw new Error("Kunde inte läsa kunderna.");
  const companies = companiesRes.data;
  const ids = companies.map((c) => c.id);

  let content: React.ReactNode;
  if (companies.length === 0) {
    content = (
      <EmptyState
        icon={Users}
        title={tab === "optely" ? "Inga Optely-kunder än" : "Inga SBA-kunder än"}
        description="Ett bolag blir kund när affären flyttas till Kund i Pipeline."
      />
    );
  } else if (tab === "optely") {
    const { data: rows } = ids.length
      ? await supabase.from("customers_optely").select("*").in("company_id", ids)
      : { data: [] };
    content = (
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {companies.map((c) => {
          const r = (rows ?? []).find((x) => x.company_id === c.id);
          return (
            <OptelyCustomerRow
              key={c.id}
              customer={{
                companyId: c.id,
                name: c.name,
                city: c.city,
                project: r?.project ?? "",
                invoiced: r?.invoiced ?? false,
                invoiceNote: r?.invoice_note ?? "",
                maintenance: r?.maintenance_agreement ?? false,
                startedAt: r?.started_at ?? null,
              }}
            />
          );
        })}
      </ul>
    );
  } else {
    const { data: rows } = ids.length
      ? await supabase.from("sba_clients").select("company_id, month, bookings").in("company_id", ids).in("month", [thisMonth, lastMonth])
      : { data: [] };
    content = (
      <>
        <p className="text-xs text-muted-foreground">
          Garantin: minst 3 bokade per månad. Färre = ingen avgift den månaden. Bokningarna skrivs in för hand tills
          GoHighLevel kopplas.
        </p>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {companies.map((c) => {
            const now = (rows ?? []).find((x) => x.company_id === c.id && x.month === thisMonth);
            const last = (rows ?? []).find((x) => x.company_id === c.id && x.month === lastMonth);
            return (
              <SbaCustomerRow
                key={c.id}
                customer={{
                  companyId: c.id,
                  name: c.name,
                  city: c.city,
                  thisMonth,
                  lastMonth,
                  bookingsNow: now?.bookings ?? 0,
                  bookingsLast: last ? last.bookings : null,
                }}
              />
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kunder"
        description={tab === "optely" ? "Optely: projekt, faktura och driftsavtal." : "SBA: bokningar mot garantin (3 per månad)."}
        actions={<OfferTabs tabs={tabs} active={tab} basePath="/customers" />}
      />
      {content}
    </div>
  );
}
