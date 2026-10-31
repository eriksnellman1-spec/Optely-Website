import type { Metadata } from "next";
import { Building2, SearchX, UserPlus } from "lucide-react";

import { CompanyTable } from "@/components/contacts/company-table";
import { ContactsFilters } from "@/components/contacts/contacts-filters";
import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { COMPANY_STATUS, COMPANY_STATUS_ORDER } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Kontakter" };

type Status = Enums<"company_status">;
const isStatus = (v: unknown): v is Status => typeof v === "string" && v in COMPANY_STATUS;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const params = await searchParams;
  const status = isStatus(first(params.status)) ? (first(params.status) as Status) : null;
  const city = first(params.city)?.trim() || null;
  const q = first(params.q)?.trim() || "";

  const supabase = await createClient();

  let query = supabase
    .from("company_overview")
    .select("id, name, city, industry, status, do_not_contact, contact_count, open_task_count, last_activity_at")
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("name")
    .limit(500);
  if (status) query = query.eq("status", status);
  if (city) query = query.eq("city", city);
  if (q) query = query.ilike("name", `%${q.replace(/[%,()*\\]/g, " ")}%`);

  const [companiesRes, facetsRes] = await Promise.all([
    query,
    supabase.from("companies").select("status, city").limit(5000),
  ]);

  if (companiesRes.error || facetsRes.error) {
    throw new Error("Kunde inte läsa bolagen från Supabase.");
  }

  const companies = companiesRes.data;
  const facets = facetsRes.data;
  const total = facets.length;

  const statusCounts = Object.fromEntries(COMPANY_STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
  const cityCounts = new Map<string, number>();
  for (const f of facets) {
    statusCounts[f.status] += 1;
    if (f.city) cityCounts.set(f.city, (cityCounts.get(f.city) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "sv"))
    .map(([name, count]) => ({ name, count }));

  const filtered = Boolean(status || city || q);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kontakter"
        description={
          <>
            <span className="font-mono tabular-nums">{total}</span> bolag i registret
          </>
        }
        actions={
          <OpenDialogButton dialog="new-contact" variant="default">
            <UserPlus />
            Ny kontakt
          </OpenDialogButton>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={Building2}
          title="Inga bolag ännu"
          description="Importera leads eller lägg till den första kontakten för hand. Testdata finns i supabase/seed.sql."
          action={
            <OpenDialogButton dialog="new-contact" variant="default">
              <UserPlus />
              Lägg till kontakt
            </OpenDialogButton>
          }
        />
      ) : (
        <>
          <ContactsFilters
            status={status}
            city={city}
            q={q}
            statusCounts={statusCounts}
            cities={cities}
            resultCount={companies.length}
          />
          {companies.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Inga bolag matchar filtret"
              description={filtered ? "Prova att ta bort ett filter eller ändra sökningen." : undefined}
            />
          ) : (
            <CompanyTable companies={companies} />
          )}
        </>
      )}
    </div>
  );
}
