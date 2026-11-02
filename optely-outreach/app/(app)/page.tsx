import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Handshake,
  MessageSquareReply,
  Phone,
  PhoneCall,
} from "lucide-react";

import { MeetingActions, TaskDoneButton } from "@/components/home/row-actions";
import { TodoPanel } from "@/components/ringpass/todo-panel";
import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Kbd } from "@/components/ui/kbd";
import { PageHeader } from "@/components/ui/page-header";
import { StatusDot } from "@/components/ui/status-dot";
import { formatDate, formatRelative, formatTime, formatWeekday, startOfTomorrowHelsinki } from "@/lib/format";
import { PARTNER_TYPE } from "@/lib/labels";
import { loadTodo } from "@/lib/queries/todo";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hem" };

const REPLY_LABEL: Record<string, string> = {
  positive: "Intresserad",
  neutral: "Neutralt svar",
};

function Section({
  title,
  icon: Icon,
  count,
  action,
  children,
  tone,
}: {
  title: string;
  icon: typeof Phone;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  tone?: "green";
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-surface",
        tone === "green" && "border-status-green/30 bg-status-green/5",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className={cn("size-4 text-muted-foreground", tone === "green" && "text-status-green")} />
        <h2 className="text-sm font-medium">{title}</h2>
        {typeof count === "number" && <span className="font-mono text-xs text-subtle">{count}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date();
  const tomorrow = startOfTomorrowHelsinki(now);
  const dayAfter = startOfTomorrowHelsinki(new Date(new Date(tomorrow).getTime() + 3600_000));

  const [noticesRes, meetingsRes, queueRes, todo, partnersRes] = await Promise.all([
    supabase.from("notices").select("*").order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("id, title, starts_at, location, company:companies(name), contact:contacts(first_name, last_name, phone)")
      .eq("status", "scheduled")
      .lt("starts_at", dayAfter)
      .order("starts_at"),
    supabase
      .from("ringpass_queue")
      .select("task_id, title, attempt, priority, company_name, first_name, last_name, partner_name, reply_id")
      .order("priority")
      .order("due_at"),
    loadTodo(supabase, tomorrow),
    supabase.from("partners_due").select("*").order("last_checkin_at", { ascending: true, nullsFirst: true }),
  ]);

  if (noticesRes.error || meetingsRes.error || queueRes.error || partnersRes.error) {
    throw new Error("Kunde inte läsa idag-listan.");
  }

  const notices = noticesRes.data;
  const meetings = meetingsRes.data;
  const queue = queueRes.data;
  const partners = partnersRes.data;
  const todoCount = todo.sms.length + todo.meetings.length + todo.linkedin.length;

  const attempts = queue.filter((q) => (q.title ?? "").startsWith("Försök")).length;
  const callLater = queue.filter((q) => (q.title ?? "").startsWith("Ring senare")).length;
  const nothing = notices.length + meetings.length + queue.length + todoCount + partners.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Idag"
        description={
          <>
            <span className="capitalize">{formatWeekday(now)}</span>{" "}
            <span className="font-mono tabular-nums">{formatDate(now)}</span> – allt som ska göras i dag, viktigast först.
          </>
        }
        actions={
          queue.length > 0 ? (
            <Button asChild>
              <Link href="/ringpass">
                <PhoneCall />
                Starta ringpass
                <Kbd className="ml-1 border-black/20 bg-black/10 text-current">g r</Kbd>
              </Link>
            </Button>
          ) : null
        }
      />

      {nothing && (
        <EmptyState
          icon={CheckCircle2}
          title="Allt klart för i dag"
          description="Inga svar, möten, samtal eller uppgifter väntar. Nya bolag släpps in i ringkön nästa ringdag – eller hämta fler direkt i Ringpasset."
          action={
            <Button asChild variant="outline">
              <Link href="/ringpass">Till Ringpasset</Link>
            </Button>
          }
        />
      )}

      {/* 1. Svar och tips */}
      {notices.length > 0 && (
        <Section title="Svar och partnertips" icon={MessageSquareReply} count={notices.length} tone="green">
          <ul className="divide-y divide-border">
            {notices.map((n) => (
              <li key={n.task_id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <StatusDot tone="green" pulse className="mt-1.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{n.company_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {n.kind === "reply"
                        ? `${REPLY_LABEL[n.classification ?? ""] ?? "Svar"} · ${n.contact_name ?? ""}`
                        : `Tips från ${n.partner_name ?? "partner"} · ${n.contact_name ?? ""}`}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      {formatRelative(n.received_at ?? n.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {n.kind === "reply" ? (n.reply_body ?? n.description) : n.description}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {n.task_type === "call" ? (
                    <Button size="sm" asChild>
                      <Link href={`/ringpass?task=${n.task_id}`}>
                        <Phone /> Ring nu
                      </Link>
                    </Button>
                  ) : (
                    n.task_id && <TaskDoneButton taskId={n.task_id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 2. Behovssamtal och möten */}
      {meetings.length > 0 && (
        <Section title="Behovssamtal och möten – i dag och i morgon" icon={CalendarClock} count={meetings.length}>
          <ul className="divide-y divide-border">
            {meetings.map((m) => {
              const contact = m.contact ? [m.contact.first_name, m.contact.last_name].filter(Boolean).join(" ") : null;
              const isToday = m.starts_at < tomorrow;
              return (
                <MeetingActions key={m.id} meetingId={m.id}>
                  <div className="w-24 shrink-0">
                    <div className="font-mono text-sm tabular-nums">{formatTime(m.starts_at)}</div>
                    <div className={cn("text-xs", isToday ? "text-brand" : "text-subtle")}>
                      {isToday ? "i dag" : "i morgon"}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.company?.name ?? m.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[contact, m.location].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {m.contact?.phone && (
                    <a
                      href={`tel:${m.contact.phone.replace(/\s+/g, "")}`}
                      className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      {m.contact.phone}
                    </a>
                  )}
                </MeetingActions>
              );
            })}
          </ul>
        </Section>
      )}

      {/* 3. Ringpass */}
      {queue.length > 0 && (
        <Section
          title="Ringpass"
          icon={PhoneCall}
          count={queue.length}
          action={
            <Button size="sm" asChild>
              <Link href="/ringpass">Starta ringpass</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
            {[
              { label: "samtal i dag", value: queue.length },
              { label: "försök i sekvens", value: attempts },
              { label: "ring senare", value: callLater },
            ].map((s) => (
              <div key={s.label} className="px-3 py-3">
                <div className="font-mono text-xl tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <ul className="divide-y divide-border">
            {queue.slice(0, 5).map((q) => (
              <li key={q.task_id}>
                <Link
                  href={`/ringpass?task=${q.task_id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-2"
                >
                  <StatusDot tone={q.priority === 1 ? "blue" : "neutral"} />
                  <span className="truncate">{q.company_name}</span>
                  <span className="truncate text-xs text-subtle">
                    {(q.title ?? "").startsWith("Försök") && q.attempt
                      ? `Försök ${q.attempt} av 3`
                      : (q.title ?? "").split(":")[0]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {queue.length > 5 && (
            <p className="px-4 py-2 text-xs text-subtle">+ {queue.length - 5} till i Ringpasset</p>
          )}
        </Section>
      )}

      {/* 4. Att göra för hand */}
      <TodoPanel data={todo} />

      {/* 5. Partner */}
      {partners.length > 0 && (
        <Section title="Partner som behöver höras" icon={Handshake} count={partners.length}>
          <ul className="divide-y divide-border">
            {partners.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[p.type ? PARTNER_TYPE[p.type] : null, p.contact_name, p.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="font-mono text-xs text-status-yellow">
                  {p.days_since === null ? "aldrig hörts" : `${p.days_since} d sedan`}
                </span>
                {p.phone && (
                  <a
                    href={`tel:${p.phone.replace(/\s+/g, "")}`}
                    className="font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {p.phone}
                  </a>
                )}
                {p.id && (
                  <OpenDialogButton dialog="partner-checkin" payload={{ partnerId: p.id }} size="sm">
                    <Handshake /> Logga check-in
                  </OpenDialogButton>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
