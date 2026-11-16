import { ArrowUpRight, Mail } from "lucide-react";

import { SyncGmailButton } from "@/components/overview/sync-gmail-button";
import { formatDateTime } from "@/lib/format";
import type { PartnerEmailLog } from "@/lib/queries/partner-emails";

function Num({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-subtle">{sub}</div>
    </div>
  );
}

/** Skickade partnermejl från Gmail på Översikt: veckosiffror, logg och knappen Synka Gmail. */
export function PartnerEmails({ data }: { data: PartnerEmailLog }) {
  const { week, lastWeek, mailedTotal, partnersTotal, latest } = data;
  return (
    <section aria-label="Partnermejl" className="rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <Mail className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Partnermejl</h2>
        <span className="text-xs text-subtle">skickade från Gmail</span>
        <div className="ml-auto">
          <SyncGmailButton />
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
        <Num
          label="Skickade denna vecka"
          value={week.sent}
          sub={
            <>
              förra veckan <span className="font-mono tabular-nums">{lastWeek.sent}</span>
            </>
          }
        />
        <Num
          label="Partner mejlade denna vecka"
          value={week.partners}
          sub={
            <>
              förra veckan <span className="font-mono tabular-nums">{lastWeek.partners}</span>
            </>
          }
        />
        <Num
          label="Mejlade totalt"
          value={
            <>
              {mailedTotal}
              <span className="text-base text-subtle"> / {partnersTotal}</span>
            </>
          }
          sub={`${Math.max(partnersTotal - mailedTotal, 0)} partner kvar att mejla`}
        />
      </div>
      {latest.length === 0 ? (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          Inga partnermejl loggade än. Skicka mejlen från Gmail och tryck Synka Gmail.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {latest.map((m) => (
            <li key={m.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{m.partnerName}</div>
                <div className="truncate text-xs text-muted-foreground">{[m.subject, m.snippet].filter(Boolean).join(" · ")}</div>
              </div>
              <span className="shrink-0 font-mono text-xs text-subtle tabular-nums">{formatDateTime(m.occurredAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
