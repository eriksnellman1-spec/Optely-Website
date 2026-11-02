"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Check, Copy, MessageSquare, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelSms, completeTask, markCalendarAdded, markSmsSent } from "@/lib/actions/ringpass";
import type { ActionResult } from "@/lib/actions/types";
import { formatDateTime, formatTime } from "@/lib/format";

export type TodoData = {
  sms: {
    id: string;
    toPhone: string;
    body: string;
    dueAt: string;
    kind: string;
    companyName: string;
    contactName: string | null;
  }[];
  meetings: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    location: string | null;
    companyName: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  }[];
  linkedin: { id: string; title: string; companyName: string; contactName: string | null }[];
};

/** Google Kalender-länk som öppnar en ifylld händelse (tills kalendersynken i fas F). */
function googleCalendarUrl(m: TodoData["meetings"][number]) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = m.endsAt ?? new Date(new Date(m.startsAt).getTime() + 20 * 60_000).toISOString();
  const details = [m.contactName, m.contactPhone, m.contactEmail].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${fmt(m.startsAt)}/${fmt(end)}`,
    details,
    location: m.location ?? "",
    ctz: "Europe/Helsinki",
  });
  if (m.contactEmail) params.set("add", m.contactEmail);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Det som ännu görs för hand: SMS (fas F kopplar in SMS-tjänsten), kalenderhändelser
 * (fas F: Google Kalender) och LinkedIn-påminnelser. Allt bockas av optimistiskt.
 */
export function TodoPanel({ data }: { data: TodoData }) {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();

  const sms = data.sms.filter((s) => !done.has(s.id));
  const meetings = data.meetings.filter((m) => !done.has(m.id));
  const linkedin = data.linkedin.filter((t) => !done.has(t.id));
  const total = sms.length + meetings.length + linkedin.length;
  if (total === 0) return null;

  function run(id: string, action: () => Promise<ActionResult>, message: string) {
    setDone((d) => new Set(d).add(id));
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        setDone((d) => {
          const n = new Set(d);
          n.delete(id);
          return n;
        });
        toast.error(r.error);
      } else {
        toast.success(message);
      }
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopierat");
    } catch {
      toast.error("Kunde inte kopiera – markera texten och kopiera för hand.");
    }
  }

  return (
    <section aria-label="Att göra" className="rounded-lg border border-status-yellow/25 bg-status-yellow/5">
      <div className="flex items-center justify-between border-b border-status-yellow/20 px-3 py-2">
        <span className="text-sm font-medium">Att göra för hand</span>
        <span className="font-mono text-xs text-muted-foreground">{total}</span>
      </div>
      <ul className="divide-y divide-border">
        {sms.map((s) => (
          <li key={s.id} className="space-y-1.5 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5 text-status-yellow" />
              <span className="truncate">
                SMS · {s.kind} · {s.contactName ?? s.companyName}
              </span>
              <span className="ml-auto shrink-0 font-mono" title={formatDateTime(s.dueAt)}>
                {formatTime(s.dueAt)}
              </span>
            </div>
            <p className="text-sm">{s.body}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" asChild>
                <a href={`sms:${s.toPhone.replace(/\s+/g, "")}?&body=${encodeURIComponent(s.body)}`}>
                  <MessageSquare /> {s.toPhone}
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => copy(s.body)}>
                <Copy /> Kopiera
              </Button>
              <Button size="sm" variant="ghost" onClick={() => run(s.id, () => markSmsSent(s.id), "SMS markerat som skickat")}>
                <Check /> Skickat
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-subtle"
                onClick={() => run(s.id, () => cancelSms(s.id), "SMS struket")}
                aria-label="Stryk SMS"
              >
                <X />
              </Button>
            </div>
          </li>
        ))}
        {meetings.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <CalendarPlus className="size-3.5 text-status-yellow" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{m.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(m.startsAt)} · {m.location ?? "telefon"}
              </div>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href={googleCalendarUrl(m)} target="_blank" rel="noreferrer">
                <CalendarPlus /> Google Kalender
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(m.id, () => markCalendarAdded(m.id), "Inlagt i kalendern")}>
              <Check /> Klart
            </Button>
          </li>
        ))}
        {linkedin.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <UserPlus className="size-3.5 text-status-blue" />
            <div className="min-w-0 flex-1 truncate text-sm">
              {t.title} <span className="text-xs text-muted-foreground">· {t.companyName}</span>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                  `${t.contactName ?? ""} ${t.companyName}`.trim(),
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <UserPlus /> Sök på LinkedIn
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(t.id, () => completeTask(t.id), "LinkedIn klart")}>
              <Check /> Klart
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
