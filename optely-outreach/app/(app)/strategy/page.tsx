import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { OfferBadge } from "@/components/offer/offer-badge";
import { ReviewForm } from "@/components/strategy/review-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { addDaysIso, formatDate, isoWeek } from "@/lib/format";
import { OFFER_LABEL, offersFor } from "@/lib/offer";
import { getOfferFilter } from "@/lib/offer-server";
import type { SearchParams } from "@/lib/page-types";
import { CHANNEL_NAME, loadWeeklyStats, per100 } from "@/lib/queries/stats";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lördagsanalys" };

function Delta({ now, prev }: { now: number; prev: number }) {
  const d = now - prev;
  if (d === 0) return <span className="ml-1 text-[11px] text-subtle">±0</span>;
  return (
    <span className={cn("ml-1 text-[11px]", d > 0 ? "text-status-green" : "text-status-red")}>
      {d > 0 ? "+" : ""}
      {d}
    </span>
  );
}

export default async function StrategyPage({ searchParams }: { searchParams: SearchParams }) {
  const filter = await getOfferFilter(searchParams);
  const params = await searchParams;
  const supabase = await createClient();
  // 5 veckor hämtas så att den äldsta av de 4 visade också får en förändring.
  const stats = await loadWeeklyStats(supabase, filter, 5);
  const shown = stats.weeks.slice(0, 4);
  const week = typeof params.week === "string" && shown.includes(params.week) ? params.week : shown[0];
  const prevWeek = addDaysIso(week, -7);
  const offers = offersFor(filter);
  const reviewOffer = filter === "all" ? null : filter;

  let reviewQuery = supabase.from("weekly_reviews").select("*").order("week_start", { ascending: false }).limit(12);
  reviewQuery = reviewOffer ? reviewQuery.eq("offer", reviewOffer) : reviewQuery.is("offer", null);
  const { data: reviews } = await reviewQuery;
  const current = (reviews ?? []).find((r) => r.week_start === week);
  const earlier = (reviews ?? []).filter((r) => r.week_start !== week && r.notes.trim());

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lördagsanalys"
        description="De senaste 4 veckornas siffror per erbjudande och kanal, förändring mot veckan före och vad som ska ändras."
      />

      <nav aria-label="Vecka" className="flex flex-wrap gap-1.5">
        {shown.map((w) => (
          <Link
            key={w}
            href={`/strategy?week=${w}`}
            className={cn(
              "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground",
              w === week && "border-border-strong bg-accent text-foreground",
            )}
          >
            v. <span className="font-mono">{isoWeek(w)}</span>
            <span className="ml-1 text-subtle">{formatDate(w).slice(0, 5)}</span>
          </Link>
        ))}
      </nav>

      {stats.rows.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Inga siffror än" description="När samtal, mejl och LinkedIn loggas räknas veckorna fram här." />
      ) : (
        offers.map((o) => (
          <section key={o} aria-label={OFFER_LABEL[o]} className="rounded-lg border border-border bg-surface">
            <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <OfferBadge offer={o} />
              <h2 className="text-sm font-medium">
                Vecka {isoWeek(week)} <span className="text-subtle">· förändring mot v. {isoWeek(prevWeek)}</span>
              </h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="h-8 border-b border-border text-left text-[11px] tracking-wide text-subtle uppercase">
                    <th className="px-4 font-medium">Kanal</th>
                    <th className="px-3 text-right font-medium">Kontaktade</th>
                    <th className="px-3 text-right font-medium">Svar</th>
                    <th className="px-3 text-right font-medium">Bokade</th>
                    <th className="px-3 text-right font-medium">Avtal</th>
                    <th className="px-4 text-right font-medium">Bokade/100</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.channelsFor(o).map((ch) => {
                    const a = stats.get(week, o, ch);
                    const b = stats.get(prevWeek, o, ch);
                    return (
                      <tr key={ch} className={cn("h-9 border-b border-border/60 last:border-0", ch === "alla" && "font-medium")}>
                        <td className="px-4">{CHANNEL_NAME[ch] ?? ch}</td>
                        <td className="px-3 text-right font-mono tabular-nums">
                          {a.contacted}
                          <Delta now={a.contacted} prev={b.contacted} />
                        </td>
                        <td className="px-3 text-right font-mono tabular-nums">
                          {a.replies}
                          <Delta now={a.replies} prev={b.replies} />
                        </td>
                        <td className="px-3 text-right font-mono tabular-nums">
                          {a.booked}
                          <Delta now={a.booked} prev={b.booked} />
                        </td>
                        <td className="px-3 text-right font-mono tabular-nums">
                          {a.won}
                          <Delta now={a.won} prev={b.won} />
                        </td>
                        <td className="px-4 text-right font-mono tabular-nums">{per100(a.booked, a.contacted)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <section aria-label="Vad ska ändras" className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-medium">
          Vad ska ändras? <span className="text-subtle">· v. {isoWeek(week)} · {reviewOffer ? OFFER_LABEL[reviewOffer] : "alla erbjudanden"}</span>
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">Fritt – inga mål eller stoppregler, bara vad du vill göra annorlunda.</p>
        <ReviewForm key={`${week}-${reviewOffer}`} weekStart={week} offer={reviewOffer} initial={current?.notes ?? ""} />
        {earlier.length > 0 && (
          <div className="mt-5 space-y-2">
            <h3 className="text-[11px] font-medium tracking-wide text-subtle uppercase">Tidigare veckor</h3>
            <ul className="space-y-2">
              {earlier.map((r) => (
                <li key={r.id} className="rounded-md border border-border px-3 py-2 text-sm">
                  <div className="text-xs text-subtle">v. {isoWeek(r.week_start)}</div>
                  <p className="whitespace-pre-wrap text-muted-foreground">{r.notes}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
