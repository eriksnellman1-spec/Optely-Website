import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { OfferBadge } from "@/components/offer/offer-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatRelative } from "@/lib/format";
import { getOfferFilter } from "@/lib/offer-server";
import type { SearchParams } from "@/lib/page-types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach" };

/** Grupper enligt uppdraget: utkast / godkänt / köat / skickat / svar. */
const GROUPS = [
  { key: "utkast", label: "Utkast", statuses: ["draft", "pending_review"] },
  { key: "godkant", label: "Godkänt", statuses: ["approved"] },
  { key: "koat", label: "Köat", statuses: ["queued"] },
  { key: "skickat", label: "Skickat", statuses: ["sent", "bounced"] },
  { key: "svar", label: "Svar", statuses: ["replied"] },
] as const;

const STATUS_NOTE: Record<string, string> = {
  pending_review: "väntar på granskning",
  draft: "utkast",
  bounced: "studsade",
};

export default async function OutreachPage({ searchParams }: { searchParams: SearchParams }) {
  const offer = await getOfferFilter(searchParams);
  const params = await searchParams;
  const supabase = await createClient();

  let q = supabase.from("email_overview").select("*").order("created_at", { ascending: false }).limit(500);
  if (offer !== "all") q = q.eq("offer", offer);
  const { data, error } = await q;
  if (error) throw new Error("Kunde inte läsa mejlen.");
  const emails = data ?? [];

  const group = GROUPS.find((g) => g.key === params.status) ?? GROUPS[0];
  const counts = Object.fromEntries(
    GROUPS.map((g) => [g.key, emails.filter((e) => (g.statuses as readonly string[]).includes(e.status ?? "")).length]),
  );
  const list = emails.filter((e) => (group.statuses as readonly string[]).includes(e.status ?? ""));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Outreach"
        description="Mejl per status. Utskick via Smartlead kopplas in senare – i dag köas mejlen för manuellt utskick."
      />

      <nav aria-label="Status" className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <Link
            key={g.key}
            href={`/outreach?status=${g.key}`}
            className={cn(
              "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground",
              g.key === group.key && "border-border-strong bg-accent text-foreground",
            )}
          >
            {g.label}
            <span className="font-mono text-xs text-subtle tabular-nums">{counts[g.key]}</span>
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <EmptyState icon={Mail} title={`Inga mejl med status ${group.label.toLowerCase()}`} description="Mejl skapas av Ringpasset (Skicka info, sista mejlet, bekräftelser) och senare av e-postsekvensen." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {list.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {e.company_id ? (
                    <Link href={`/contacts/${e.company_id}`} className="font-medium hover:underline">
                      {e.company_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{e.company_name}</span>
                  )}
                  <OfferBadge offer={e.offer} />
                  {e.status && STATUS_NOTE[e.status] && <span className="text-xs text-status-yellow">{STATUS_NOTE[e.status]}</span>}
                </div>
                <div className="truncate text-sm">{e.subject}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[e.contact_name, e.contact_email].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="font-mono text-xs text-subtle">
                {formatRelative(e.sent_at ?? e.queued_at ?? e.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
