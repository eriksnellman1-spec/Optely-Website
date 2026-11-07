import Link from "next/link";
import { CalendarClock, Handshake, MessageSquareReply, Phone } from "lucide-react";

import { MeetingActions, TaskDoneButton } from "@/components/home/row-actions";
import { OfferBadge } from "@/components/offer/offer-badge";
import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { formatRelative, formatTime } from "@/lib/format";
import { PARTNER_TYPE } from "@/lib/labels";
import type { FollowupData } from "@/lib/queries/followups";
import { cn } from "@/lib/utils";

const REPLY_LABEL: Record<string, string> = { positive: "Intresserad", neutral: "Neutralt svar" };

function Block({
  title,
  icon: Icon,
  count,
  tone,
  children,
}: {
  title: string;
  icon: typeof Phone;
  count: number;
  tone?: "green";
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-lg border border-border bg-surface", tone === "green" && "border-status-green/30 bg-status-green/5")}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className={cn("size-4 text-muted-foreground", tone === "green" && "text-status-green")} />
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="font-mono text-xs text-subtle">{count}</span>
      </header>
      {children}
    </section>
  );
}

/** Dagens uppföljningar överst på Idag: svar och partnertips, möten, partner att höra. */
export function TodayFollowups({ data }: { data: FollowupData }) {
  const { notices, meetings, partners } = data;
  if (notices.length + meetings.length + partners.length === 0) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {notices.length > 0 && (
        <Block title="Svar och partnertips" icon={MessageSquareReply} count={notices.length} tone="green">
          <ul className="divide-y divide-border">
            {notices.map((n) => (
              <li key={n.task_id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <StatusDot tone="green" pulse className="mt-1.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium">{n.company_name}</span>
                    <OfferBadge offer={n.offer} />
                    <span className="font-mono text-xs text-subtle">{formatRelative(n.received_at ?? n.created_at)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {n.kind === "reply"
                      ? `${REPLY_LABEL[n.classification ?? ""] ?? "Svar"} · ${n.contact_name ?? ""}`
                      : `Tips från ${n.partner_name ?? "partner"} · ${n.contact_name ?? ""}`}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {n.kind === "reply" ? (n.reply_body ?? n.description) : n.description}
                  </p>
                </div>
                {n.task_type === "call" ? (
                  <Button size="sm" asChild>
                    <Link href={`/ringpass?task=${n.task_id}`}>
                      <Phone /> Ring nu
                    </Link>
                  </Button>
                ) : (
                  n.task_id && <TaskDoneButton taskId={n.task_id} />
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {meetings.length > 0 && (
        <Block title="Möten i dag och i morgon" icon={CalendarClock} count={meetings.length}>
          <ul className="divide-y divide-border">
            {meetings.map((m) => (
              <MeetingActions key={m.id} meetingId={m.id}>
                <div className="w-20 shrink-0">
                  <div className="font-mono text-sm tabular-nums">{formatTime(m.starts_at)}</div>
                  <div className={cn("text-xs", m.isToday ? "text-brand" : "text-subtle")}>
                    {m.isToday ? "i dag" : "i morgon"}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.companyName}</span>
                    <OfferBadge offer={m.offer} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[m.contactName, m.location, m.phone].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </MeetingActions>
            ))}
          </ul>
        </Block>
      )}

      {partners.length > 0 && (
        <Block title="Partner som behöver höras" icon={Handshake} count={partners.length}>
          <ul className="divide-y divide-border">
            {partners.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[p.type ? PARTNER_TYPE[p.type] : null, p.contact_name, p.phone].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="font-mono text-xs text-status-yellow">
                  {p.days_since === null ? "aldrig hörts" : `${p.days_since} d sedan`}
                </span>
                {p.id && (
                  <OpenDialogButton dialog="partner-checkin" payload={{ partnerId: p.id }} size="sm">
                    <Handshake /> Logga check-in
                  </OpenDialogButton>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}
