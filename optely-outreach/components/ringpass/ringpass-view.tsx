"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Ban,
  Building2,
  CalendarCheck,
  ExternalLink,
  Flame,
  Mail,
  MessageSquareReply,
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  ThumbsDown,
  UserRoundX,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Kbd } from "@/components/ui/kbd";
import { StatusDot } from "@/components/ui/status-dot";
import { Textarea } from "@/components/ui/textarea";
import { logCallOutcome, type Outcome, type OutcomeInput } from "@/lib/actions/ringpass";
import { formatDateTime, formatRelative, formatTime } from "@/lib/format";
import { COMPANY_STATUS } from "@/lib/labels";
import { stepInfo, VOICEMAIL_STEPS } from "@/lib/sequence";
import type { Enums } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { OutcomeDialog } from "./outcome-dialog";
import { ScriptPanel, type ScriptEntry } from "./script-panel";
import { SequenceProgress } from "./sequence-progress";

export type QueueItem = {
  taskId: string;
  taskType: "call" | "follow_up";
  title: string;
  description: string | null;
  priority: number;
  dueAt: string;
  isReply: boolean;
  taskStep: number | null;
  companyId: string;
  companyName: string;
  city: string | null;
  industry: string | null;
  website: string | null;
  companyStatus: Enums<"company_status"> | null;
  companyNotes: string | null;
  sequenceStep: number | null;
  contactId: string | null;
  contactName: string | null;
  firstName: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
};

export type TimelineEvent = {
  at: string;
  kind: "call" | "email" | "reply";
  text: string;
  detail: string | null;
};

export const OUTCOME_BUTTONS: { key: string; outcome: Outcome; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "1", outcome: "no_answer", label: "Inget svar", icon: PhoneMissed, tone: "" },
  { key: "2", outcome: "callback", label: "Ring tillbaka", icon: PhoneCall, tone: "text-status-blue" },
  { key: "3", outcome: "interested", label: "Intresserad", icon: Flame, tone: "text-status-green" },
  { key: "4", outcome: "meeting_booked", label: "Möte bokat", icon: CalendarCheck, tone: "text-brand" },
  { key: "5", outcome: "not_interested", label: "Inte intresserad", icon: ThumbsDown, tone: "text-status-yellow" },
  { key: "6", outcome: "wrong_person", label: "Fel person", icon: UserRoundX, tone: "" },
  { key: "7", outcome: "do_not_call", label: "Ring inte igen", icon: Ban, tone: "text-status-red" },
];

function isTyping(target: EventTarget | null) {
  const t = target as HTMLElement | null;
  return Boolean(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable));
}

export function RingpassView({
  queue,
  timeline,
  scripts,
}: {
  queue: QueueItem[];
  timeline: Record<string, TimelineEvent[]>;
  scripts: ScriptEntry[];
}) {
  // Optimistiskt borttagna uppgifter – servern bekräftar via revalidering.
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const visible = useMemo(() => queue.filter((q) => !removed.has(q.taskId)), [queue, removed]);

  const [selectedId, setSelectedId] = useState<string | null>(queue[0]?.taskId ?? null);
  const selected = visible.find((q) => q.taskId === selectedId) ?? visible[0] ?? null;

  const [dialog, setDialog] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [voicemail, setVoicemail] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const voicemailFor = (item: QueueItem) =>
    voicemail[item.taskId] ?? VOICEMAIL_STEPS.has(item.taskStep ?? item.sequenceStep ?? 0);

  const move = useCallback(
    (delta: number) => {
      if (!selected) return;
      const i = visible.findIndex((q) => q.taskId === selected.taskId);
      const next = visible[Math.min(visible.length - 1, Math.max(0, i + delta))];
      if (next) setSelectedId(next.taskId);
    },
    [selected, visible],
  );

  // Håll valt samtal synligt i kölistan – scrolla bara listan, aldrig sidan
  // (på mobil ligger kön under kortet och sidan får inte hoppa).
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-task="${selected?.taskId}"]`);
    if (!list || !el) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + el.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = top + el.offsetHeight - list.clientHeight;
  }, [selected?.taskId]);

  const submit = useCallback(
    (item: QueueItem, outcome: Outcome, payload?: OutcomeInput["payload"]) => {
      setDialog(null);
      const index = visible.findIndex((q) => q.taskId === item.taskId);
      const following = visible[index + 1] ?? visible[index - 1] ?? null;

      // Optimistiskt: ta bort raden och gå vidare direkt.
      setRemoved((r) => new Set(r).add(item.taskId));
      setSelectedId(following?.taskId ?? null);

      const input: OutcomeInput = {
        taskId: item.taskId,
        outcome,
        notes: notes[item.taskId],
        voicemail: outcome === "no_answer" && voicemailFor(item),
        payload,
      };

      startTransition(async () => {
        const result = await logCallOutcome(input);
        setRemoved((r) => {
          const next = new Set(r);
          next.delete(item.taskId);
          return next;
        });
        if (!result.ok) {
          setSelectedId(item.taskId);
          toast.error(result.error);
          return;
        }
        const { message, emailsQueued, emailsFailed } = result.data;
        toast.success(`${item.companyName}: ${message}`, {
          description:
            emailsFailed > 0
              ? `${emailsFailed} mejl kunde inte skickas (saknar kontakten e-post?)`
              : emailsQueued > 0
                ? `${emailsQueued} mejl lämnat till utskick`
                : undefined,
        });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- voicemailFor läser aktuellt state via closure
    [visible, notes, voicemail],
  );

  const choose = useCallback(
    (item: QueueItem, outcome: Outcome) => {
      if (outcome === "no_answer") submit(item, outcome);
      else setDialog(outcome);
    },
    [submit],
  );

  // Tangentbord: j/k byter samtal, 1–7 utfall, n anteckning, v röstmeddelande.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || dialog || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (document.querySelector("[role=dialog]")) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (selected && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        const b = OUTCOME_BUTTONS.find((x) => x.key === e.key);
        if (b) choose(selected, b.outcome);
      } else if (e.key === "n" && selected) {
        e.preventDefault();
        notesRef.current?.focus();
      } else if (e.key === "v" && selected) {
        e.preventDefault();
        setVoicemail((v) => ({ ...v, [selected.taskId]: !voicemailFor(selected) }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- voicemailFor är en ren hjälpare över state
  }, [dialog, move, selected, choose, voicemail]);

  if (!selected) {
    return (
      <EmptyState
        icon={Phone}
        title="Inga samtal kvar i dag"
        description="Snyggt jobbat! Nya samtal dyker upp här när sekvensen har nästa ringdag, när någon svarar positivt eller när en ring tillbaka-tid är inne."
        action={
          <Button asChild variant="outline">
            <Link href="/contacts">
              <Building2 />
              Till Kontakter
            </Link>
          </Button>
        }
      />
    );
  }

  const status = selected.companyStatus ? COMPANY_STATUS[selected.companyStatus] : null;
  const step = stepInfo(selected.taskStep ?? selected.sequenceStep);
  const events = timeline[selected.companyId] ?? [];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_auto]">
        {/* Kö */}
        <section aria-label="Kö" className="order-2 lg:order-1">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">
            <span>Kö</span>
            <span className="font-mono normal-case">
              <Kbd>j</Kbd> <Kbd>k</Kbd>
            </span>
          </div>
          <ol ref={listRef} className="max-h-[70vh] space-y-0.5 overflow-y-auto pr-1">
            {visible.map((q) => {
              const active = q.taskId === selected.taskId;
              const s = stepInfo(q.taskStep ?? q.sequenceStep);
              return (
                <li key={q.taskId} data-task={q.taskId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(q.taskId)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-surface-2",
                      active && "border-border bg-surface-2",
                    )}
                  >
                    <span className="flex w-full items-center gap-2">
                      {q.isReply ? (
                        <StatusDot tone="green" pulse label="Positivt svar" />
                      ) : q.priority === 1 ? (
                        <StatusDot tone="blue" label="Hög prioritet" />
                      ) : (
                        <StatusDot tone="neutral" />
                      )}
                      <span className="truncate text-sm font-medium">{q.companyName}</span>
                    </span>
                    <span className="w-full truncate pl-4 text-xs text-subtle">
                      {q.isReply ? "Positivt svar" : q.taskType === "follow_up" ? "Uppföljning" : (s?.short ?? "Samtal")}
                      {q.contactName ? ` · ${q.contactName}` : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Kontaktkort */}
        <section aria-label="Kontaktkort" className="order-1 min-w-0 lg:order-2">
          <div className="rounded-lg border border-border bg-surface">
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-tight">{selected.companyName}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    {[selected.city, selected.industry].filter(Boolean).join(" · ")}
                    {selected.website && (
                      <a
                        href={selected.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-subtle hover:text-foreground"
                      >
                        {selected.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </p>
                </div>
                {status && (
                  <span className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs">
                    <StatusDot tone={status.tone} />
                    {status.label}
                  </span>
                )}
              </div>

              {selected.sequenceStep !== null || selected.taskStep !== null ? (
                <SequenceProgress current={selected.taskStep ?? selected.sequenceStep} />
              ) : null}

              {(selected.isReply || selected.description) && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    selected.isReply ? "border-status-green/30 bg-status-green/10" : "border-border bg-surface-2",
                  )}
                >
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {selected.isReply && <MessageSquareReply className="size-3.5 text-status-green" />}
                    {selected.title}
                  </div>
                  {selected.description && <p className="whitespace-pre-wrap">{selected.description}</p>}
                </div>
              )}

              {/* Kontakten */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{selected.contactName ?? "Ingen kontaktperson"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[selected.role, selected.email].filter(Boolean).join(" · ") || "–"}
                  </div>
                </div>
                {selected.phone ? (
                  <Button asChild size="lg" className="font-mono tabular-nums">
                    <a href={`tel:${selected.phone.replace(/\s+/g, "")}`}>
                      <Phone />
                      {selected.phone}
                    </a>
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-status-yellow">
                    <PhoneOff className="size-3.5" /> Telefonnummer saknas
                  </span>
                )}
              </div>

              {/* Anteckning + röstmeddelande */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="call-notes" className="text-xs font-medium text-muted-foreground">
                    Anteckning <Kbd className="ml-1">n</Kbd>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={voicemailFor(selected)}
                      onChange={(e) => setVoicemail((v) => ({ ...v, [selected.taskId]: e.target.checked }))}
                      className="accent-[var(--brand)]"
                    />
                    Lämnade röstmeddelande <Kbd>v</Kbd>
                  </label>
                </div>
                <Textarea
                  id="call-notes"
                  ref={notesRef}
                  rows={2}
                  value={notes[selected.taskId] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [selected.taskId]: e.target.value }))}
                  placeholder="Vad sa de? Sparas med utfallet."
                />
              </div>
            </div>

            {/* Utfall */}
            <div className="grid grid-cols-2 gap-1.5 border-t border-border p-3 sm:grid-cols-4 2xl:grid-cols-7">
              {OUTCOME_BUTTONS.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => choose(selected, b.outcome)}
                    className={cn(
                      "group flex h-14 flex-col items-center justify-center gap-1 rounded-md border border-border bg-background/40 text-xs transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                      b.outcome === "meeting_booked" && "border-brand/40 bg-brand/10 hover:bg-brand/15",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Kbd className="h-4 min-w-4 text-[9px]">{b.key}</Kbd>
                      <Icon className={cn("size-4", b.tone)} />
                    </span>
                    <span className="truncate px-1">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Historik */}
          <div className="mt-4">
            <h3 className="mb-2 px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Senaste händelser</h3>
            {events.length === 0 ? (
              <p className="px-1 text-sm text-subtle">Inga tidigare samtal eller mejl.</p>
            ) : (
              <ol className="space-y-2">
                {events.map((ev, i) => (
                  <li key={`${ev.at}-${i}`} className="flex gap-3 text-sm">
                    <span className="mt-0.5">
                      {ev.kind === "call" ? (
                        <Phone className="size-3.5 text-muted-foreground" />
                      ) : ev.kind === "email" ? (
                        <Mail className="size-3.5 text-muted-foreground" />
                      ) : (
                        <MessageSquareReply className="size-3.5 text-status-green" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate">{ev.text}</span>
                        <span className="shrink-0 font-mono text-xs text-subtle" title={formatDateTime(ev.at)}>
                          {formatRelative(ev.at)}
                        </span>
                      </div>
                      {ev.detail && <p className="line-clamp-2 text-xs text-muted-foreground">{ev.detail}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {selected.companyNotes && (
              <p className="mt-3 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                {selected.companyNotes}
              </p>
            )}
          </div>
        </section>

        {/* Manus */}
        <ScriptPanel
          entries={scripts}
          firstName={selected.firstName}
          companyName={selected.companyName}
          className="order-3 lg:col-span-2 xl:col-span-1"
        />
      </div>

      <OutcomeDialog
        outcome={dialog}
        item={selected}
        stepLabel={step?.label ?? null}
        dueLabel={formatTime(selected.dueAt)}
        onCancel={() => setDialog(null)}
        onSubmit={(outcome, payload) => submit(selected, outcome, payload)}
      />
    </>
  );
}
