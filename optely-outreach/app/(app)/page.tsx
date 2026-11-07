import type { Metadata } from "next";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3 } from "lucide-react";

import { OfferBadge } from "@/components/offer/offer-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, isoWeek } from "@/lib/format";
import { OFFER_LABEL, offersFor } from "@/lib/offer";
import { getOfferFilter } from "@/lib/offer-server";
import { CHANNEL_NAME, loadWeeklyStats, per100 } from "@/lib/queries/stats";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Översikt" };

function Metric({ label, value, previous }: { label: string; value: number; previous: number }) {
  const diff = value - previous;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : ArrowRight;
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums">{value}</div>
      <div
        className={cn(
          "mt-1 flex items-center gap-1 text-xs",
          diff > 0 ? "text-status-green" : diff < 0 ? "text-status-red" : "text-subtle",
        )}
      >
        <Icon className="size-3.5" />
        <span className="font-mono tabular-nums">
          {diff > 0 ? "+" : ""}
          {diff}
        </span>
        <span className="text-subtle">mot förra veckan ({previous})</span>
      </div>
    </div>
  );
}

export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const filter = await getOfferFilter(searchParams);
  const supabase = await createClient();
  const stats = await loadWeeklyStats(supabase, filter, 4);
  const [thisWeek, lastWeek] = stats.weeks;
  const offers = offersFor(filter);
  const hasData = stats.rows.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Översikt"
        description={
          <>
            Vecka <span className="font-mono">{isoWeek(thisWeek)}</span> (från {formatDate(thisWeek)}) ·{" "}
            {OFFER_LABEL[filter] === "Alla" ? "Optely och SBA" : OFFER_LABEL[filter]} · bara mätning, inga mål
          </>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Inga siffror än"
          description="Siffrorna räknas fram ur samtal, mejl, LinkedIn och möten. Ring eller logga en kontakt så syns veckan här."
        />
      ) : (
        <>
          <div className={cn("grid gap-4", offers.length > 1 && "lg:grid-cols-2")}>
            {offers.map((o) => {
              const now = stats.get(thisWeek, o, "alla");
              const prev = stats.get(lastWeek, o, "alla");
              return (
                <section key={o} aria-label={OFFER_LABEL[o]} className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <OfferBadge offer={o} /> Denna vecka
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="Kontaktade" value={now.contacted} previous={prev.contacted} />
                    <Metric label="Svar" value={now.replies} previous={prev.replies} />
                    <Metric label="Bokade möten" value={now.booked} previous={prev.booked} />
                    <Metric label="Avtal" value={now.won} previous={prev.won} />
                  </div>
                </section>
              );
            })}
          </div>

          <section aria-label="Bokade per 100" className="rounded-lg border border-border bg-surface">
            <header className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-medium">Bokade möten per 100 kontaktade</h2>
              <p className="text-xs text-muted-foreground">Per erbjudande och kanal. Mötet räknas på kanalen som bokade det.</p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="h-8 border-b border-border text-left text-[11px] tracking-wide text-subtle uppercase">
                    <th className="px-4 font-medium">Kanal</th>
                    <th className="px-3 text-right font-medium">Denna vecka</th>
                    <th className="px-3 text-right font-medium">Förra veckan</th>
                    <th className="px-4 text-right font-medium">4 veckor</th>
                  </tr>
                </thead>
                {offers.map((o) => (
                  <tbody key={o} className="border-b border-border last:border-0">
                    <tr>
                      <td colSpan={4} className="px-4 pt-3 pb-1">
                        <OfferBadge offer={o} />
                      </td>
                    </tr>
                    {stats.channelsFor(o).map((ch) => {
                      const a = stats.get(thisWeek, o, ch);
                      const b = stats.get(lastWeek, o, ch);
                      const all = stats.weeks.map((w) => stats.get(w, o, ch));
                      const sumC = all.reduce((s, r) => s + r.contacted, 0);
                      const sumB = all.reduce((s, r) => s + r.booked, 0);
                      return (
                        <tr key={ch} className={cn("h-9", ch === "alla" && "font-medium")}>
                          <td className="px-4">{CHANNEL_NAME[ch] ?? ch}</td>
                          <td className="px-3 text-right font-mono tabular-nums">
                            {per100(a.booked, a.contacted)}
                            <span className="ml-2 text-xs text-subtle">
                              {a.booked}/{a.contacted}
                            </span>
                          </td>
                          <td className="px-3 text-right font-mono tabular-nums">
                            {per100(b.booked, b.contacted)}
                            <span className="ml-2 text-xs text-subtle">
                              {b.booked}/{b.contacted}
                            </span>
                          </td>
                          <td className="px-4 text-right font-mono tabular-nums">
                            {per100(sumB, sumC)}
                            <span className="ml-2 text-xs text-subtle">
                              {sumB}/{sumC}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
