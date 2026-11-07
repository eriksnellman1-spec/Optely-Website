import type { Metadata } from "next";
import Link from "next/link";
import { Kanban } from "lucide-react";

import { MoveStage } from "@/components/pipeline/move-stage";
import { OfferBadge } from "@/components/offer/offer-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatEur } from "@/lib/format";
import { DEAL_STAGE_LABEL, PIPELINE_STAGES } from "@/lib/labels";
import { getOfferFilter } from "@/lib/offer-server";
import type { SearchParams } from "@/lib/page-types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const offer = await getOfferFilter(searchParams);
  const supabase = await createClient();
  let q = supabase.from("pipeline_cards").select("*").order("stage_changed_at", { ascending: false }).limit(1000);
  if (offer !== "all") q = q.eq("offer", offer);
  const { data, error } = await q;
  if (error) throw new Error("Kunde inte läsa pipelinen.");

  const cards = data ?? [];
  const total = cards.filter((c) => c.stage !== "kund").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pipeline"
        description={
          <>
            <span className="font-mono tabular-nums">{total}</span> öppna affärer · Kontaktad → Svar → Möte bokat → Möte hållet → Offert → Kund
          </>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Inga affärer än"
          description="En affär skapas automatiskt när ett bolag kommer in i sekvensen. Ring från Idag så fylls pipelinen."
        />
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-6 md:gap-4 md:space-y-0 md:overflow-x-auto">
          {PIPELINE_STAGES.map((stage) => {
            const col = cards.filter((c) => c.stage === stage);
            const value = col.reduce((s, c) => s + (c.value_eur ?? 0), 0);
            return (
              <section key={stage} aria-label={DEAL_STAGE_LABEL[stage]} className="min-w-0 md:min-w-[180px]">
                <header className="mb-2 flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
                  <h2 className="text-sm font-medium">{DEAL_STAGE_LABEL[stage]}</h2>
                  <span className="font-mono text-xs text-subtle tabular-nums">
                    {col.length}
                    {value > 0 && ` · ${formatEur(value)}`}
                  </span>
                </header>
                {col.length === 0 ? (
                  <p className="px-1 text-xs text-subtle">Inga här.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {col.map((c) => (
                      <li key={c.deal_id} className="rounded-md border border-border bg-surface p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/contacts/${c.company_id}`} className="min-w-0 truncate text-sm font-medium hover:underline">
                            {c.company_name}
                          </Link>
                          <OfferBadge offer={c.offer} />
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[c.industry, c.city].filter(Boolean).join(" · ")}
                        </div>
                        {c.next_action && (
                          <div
                            className={cn(
                              "mt-1.5 text-xs",
                              c.next_action_at && c.next_action_at < new Date().toISOString() ? "text-status-yellow" : "text-foreground",
                            )}
                          >
                            {c.next_action}
                            {c.next_action_at && <span className="ml-1 font-mono text-subtle">{formatDate(c.next_action_at)}</span>}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-subtle tabular-nums">
                            {c.value_eur ? formatEur(c.value_eur) : ""}
                          </span>
                          {c.company_id && c.stage && (
                            <MoveStage companyId={c.company_id} stage={c.stage} companyName={c.company_name ?? ""} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
