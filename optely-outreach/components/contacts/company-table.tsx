import { StatusDot } from "@/components/ui/status-dot";
import { formatDateTime, formatRelative } from "@/lib/format";
import { COMPANY_STATUS } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Row = Pick<
  Tables<"company_overview">,
  | "id"
  | "name"
  | "city"
  | "industry"
  | "status"
  | "do_not_contact"
  | "contact_count"
  | "open_task_count"
  | "last_activity_at"
>;

export function CompanyTable({ companies }: { companies: Row[] }) {
  const now = new Date();

  return (
    // Kolumnerna anpassar sig efter tabellens egen bredd (container queries), inte fönstrets –
    // annars äter sidomenyn upp platsen för bolagsnamnet i mellanstora fönster.
    <div className="@container overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="h-8 border-b border-border text-left text-[11px] font-medium tracking-wide text-subtle uppercase">
            <th className="px-3 font-medium">Bolag</th>
            <th className="w-32 px-3 font-medium @max-2xl:hidden">Ort</th>
            <th className="w-32 px-3 font-medium">Status</th>
            <th className="w-24 px-3 text-right font-medium @max-3xl:hidden">Kontakter</th>
            <th className="w-36 px-3 text-right font-medium @max-2xl:hidden">Senaste aktivitet</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => {
            const status = c.status ? COMPANY_STATUS[c.status] : null;
            return (
              <tr
                key={c.id}
                className="h-9 border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="px-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.do_not_contact && (
                      <span className="shrink-0 rounded bg-status-red/15 px-1 text-[10px] text-status-red">
                        Avregistrerad
                      </span>
                    )}
                    {(c.open_task_count ?? 0) > 0 && (
                      <span
                        className="shrink-0 rounded bg-brand/15 px-1 font-mono text-[10px] text-brand"
                        title="Öppna uppgifter"
                      >
                        {c.open_task_count}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-subtle @2xl:hidden">
                    {[c.city, c.industry, c.last_activity_at && formatRelative(c.last_activity_at, now)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="truncate px-3 text-muted-foreground @max-2xl:hidden">{c.city ?? "–"}</td>
                <td className="px-3">
                  {status && (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <StatusDot tone={status.tone} />
                      <span className={cn(status.tone === "brand" && "text-brand")}>{status.label}</span>
                    </span>
                  )}
                </td>
                <td className="px-3 text-right font-mono text-muted-foreground tabular-nums @max-3xl:hidden">
                  {c.contact_count ?? 0}
                </td>
                <td
                  className="px-3 text-right font-mono text-xs text-muted-foreground tabular-nums @max-2xl:hidden"
                  title={c.last_activity_at ? formatDateTime(c.last_activity_at) : undefined}
                >
                  {formatRelative(c.last_activity_at, now)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
