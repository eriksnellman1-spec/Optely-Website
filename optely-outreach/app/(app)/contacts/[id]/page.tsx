import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Handshake,
  History,
  Mail,
  MessageSquare,
  MessageSquareReply,
  Phone,
  Users,
} from "lucide-react";

import { LogLinkedinButton, OfferChanger } from "@/components/contacts/company-actions";
import { OfferBadge } from "@/components/offer/offer-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { formatDateTime, formatRelative } from "@/lib/format";
import { CALL_OUTCOME_LABEL, COMPANY_STATUS, DEAL_STAGE_LABEL } from "@/lib/labels";
import type { IdParams } from "@/lib/page-types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Företag" };

const CHANNEL_ICON: Record<string, typeof Phone> = {
  samtal: Phone,
  "e-post": Mail,
  sms: MessageSquare,
  linkedin: Users,
  partner: Handshake,
  möte: CalendarClock,
};

const REPLY_LABEL: Record<string, string> = {
  positive: "positivt",
  neutral: "neutralt",
  negative: "nej tack",
  unsubscribe: "avregistrering",
  out_of_office: "frånvaro",
};

function describe(a: { channel: string | null; type: string | null; outcome: string | null }) {
  if (a.channel === "samtal") return `Samtal – ${CALL_OUTCOME_LABEL[a.outcome ?? ""] ?? a.outcome ?? ""}`;
  if (a.channel === "e-post" && a.type === "svar") return `E-postsvar – ${REPLY_LABEL[a.outcome ?? ""] ?? a.outcome ?? ""}`;
  if (a.channel === "e-post") return `E-post ${a.type}`;
  if (a.channel === "sms") return `SMS ${a.type}`;
  if (a.channel === "linkedin") return a.type === "svar" ? "LinkedIn – svar" : "LinkedIn – skickat";
  if (a.channel === "möte") return `Möte ${a.type}`;
  return `${a.channel ?? ""} ${a.type ?? ""}`;
}

export default async function CompanyPage({ params }: { params: IdParams }) {
  const { id } = await params;
  const supabase = await createClient();

  const [companyRes, contactsRes, activitiesRes, dealRes] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase.from("contacts").select("*").eq("company_id", id).order("is_primary", { ascending: false }),
    supabase
      .from("activities")
      .select("source, source_id, channel, type, outcome, note, occurred_at, duration_seconds, contact_id")
      .eq("company_id", id)
      .order("occurred_at", { ascending: false })
      .limit(200),
    supabase.from("deals").select("stage, value_eur, next_action, next_action_at").eq("company_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (companyRes.error) throw new Error("Kunde inte läsa bolaget.");
  const c = companyRes.data;
  if (!c) notFound();

  const contacts = contactsRes.data ?? [];
  const activities = activitiesRes.data ?? [];
  const deal = dealRes.data;
  const status = COMPANY_STATUS[c.status];
  const contactName = (cid: string | null) => {
    const k = contacts.find((x) => x.id === cid);
    return k ? [k.first_name, k.last_name].filter(Boolean).join(" ") : null;
  };

  return (
    <div className="space-y-5">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Företag
      </Link>

      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
            {c.name} <OfferBadge offer={c.offer} />
          </h1>
          <p className="text-sm text-muted-foreground">
            {[c.industry, c.employees ? `${c.employees} anställda` : null, c.city].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <StatusDot tone={status.tone} /> {status.label}
            </span>
            {deal && (
              <span className="text-muted-foreground">
                Affär: {DEAL_STAGE_LABEL[deal.stage]}
                {deal.value_eur ? ` · ${deal.value_eur.toLocaleString("sv-FI")} €` : ""}
              </span>
            )}
            {c.website && (
              <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-subtle hover:text-foreground">
                {c.website.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
              </a>
            )}
            {c.phone && (
              <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="font-mono text-xs text-subtle hover:text-foreground">
                {c.phone}
              </a>
            )}
          </div>
          {c.notes && <p className="max-w-xl pt-1 text-sm text-muted-foreground">{c.notes}</p>}
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <OfferChanger companyId={c.id} offer={c.offer} />
          <LogLinkedinButton
            companyId={c.id}
            contacts={contacts.map((k) => ({ id: k.id, name: [k.first_name, k.last_name].filter(Boolean).join(" ") }))}
          />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section aria-label="Kontakter" className="space-y-2">
          <h2 className="px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Kontakter</h2>
          {contacts.length === 0 ? (
            <p className="px-1 text-sm text-subtle">Inga kontaktpersoner.</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((k) => (
                <li key={k.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                  <div className="font-medium">
                    {[k.first_name, k.last_name].filter(Boolean).join(" ")}
                    {k.is_primary && <span className="ml-2 text-xs text-subtle">huvudkontakt</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{k.role ?? "–"}</div>
                  <div className="mt-1 flex flex-col gap-0.5 text-xs">
                    {k.phone && (
                      <a href={`tel:${k.phone.replace(/\s+/g, "")}`} className="font-mono text-muted-foreground hover:text-foreground">
                        {k.phone}
                      </a>
                    )}
                    {k.email && <span className="truncate text-muted-foreground">{k.email}</span>}
                    {k.do_not_contact && <span className="text-status-red">Kontakta ej</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Historik" className="min-w-0">
          <h2 className="mb-2 px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Historik – alla kanaler</h2>
          {activities.length === 0 ? (
            <EmptyState icon={History} title="Ingen historik än" description="Samtal, mejl, SMS, LinkedIn och möten med bolaget visas här, nyast först." />
          ) : (
            <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
              {activities.map((a, i) => {
                const Icon = CHANNEL_ICON[a.channel ?? ""] ?? (a.type === "svar" ? MessageSquareReply : History);
                const who = contactName(a.contact_id);
                return (
                  <li key={`${a.source}-${a.source_id}-${a.type}-${i}`} className="flex gap-3 px-4 py-3 text-sm">
                    <Icon className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", a.type === "svar" && "text-status-green")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="font-medium">{describe(a)}</span>
                        <span className="font-mono text-xs text-subtle" title={a.occurred_at ? formatDateTime(a.occurred_at) : undefined}>
                          {a.occurred_at ? formatRelative(a.occurred_at) : "–"}
                        </span>
                      </div>
                      {(who || a.note) && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{[who, a.note].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
