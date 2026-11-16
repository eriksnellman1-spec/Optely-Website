import { ArrowDownLeft, ArrowUpRight, Mail } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import type { PartnerEmailLog } from "@/lib/queries/partner-emails";
import { cn } from "@/lib/utils";

function Num({ label, value, previous, hint }: { label: string; value: number; previous: number; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-subtle">
        förra veckan <span className="font-mono tabular-nums">{previous}</span>
        {hint && <span> · {hint}</span>}
      </div>
    </div>
  );
}

const rate = (replied: number, sent: number) => (sent > 0 ? Math.round((replied / sent) * 100) : 0);

/** Partnermejl från Gmail på Översikt: veckosiffror och logg. */
export function PartnerEmails({ data }: { data: PartnerEmailLog }) {
  const { week, lastWeek, latest } = data;
  return (
    <section aria-label="Partnermejl" className="rounded-lg border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Mail className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Partnermejl</h2>
        <span className="text-xs text-subtle">loggas automatiskt från Gmail</span>
      </header>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        <Num label="Skickade mejl" value={week.sent} previous={lastWeek.sent} />
        <Num label="Partner mejlade" value={week.partnersSent} previous={lastWeek.partnersSent} />
        <Num label="Svar" value={week.replies} previous={lastWeek.replies} />
        <Num
          label="Svarsfrekvens"
          value={rate(week.partnersReplied, week.partnersSent)}
          previous={rate(lastWeek.partnersReplied, lastWeek.partnersSent)}
          hint="% av mejlade"
        />
      </div>
      {latest.length === 0 ? (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Inga partnermejl loggade än. När n8n-flödet är aktivt dyker skickade mejl och svar upp här.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {latest.map((m) => {
            const sent = m.direction === "sent";
            const Icon = sent ? ArrowUpRight : ArrowDownLeft;
            return (
              <li key={m.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <Icon className={cn("mt-0.5 size-4 shrink-0", sent ? "text-muted-foreground" : "text-status-green")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{m.partnerName}</span>
                    <span className={cn("text-xs", sent ? "text-subtle" : "text-status-green")}>{sent ? "skickat" : "svar"}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{[m.subject, m.snippet].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="shrink-0 font-mono text-xs text-subtle tabular-nums">{formatDateTime(m.occurredAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
