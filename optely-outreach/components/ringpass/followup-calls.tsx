"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Handshake, Kanban, Phone, PhoneOff, X } from "lucide-react";
import { toast } from "sonner";

import { OfferBadge } from "@/components/offer/offer-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { followupCallOutcome, type FollowupOutcome, type NextChannel } from "@/lib/actions/followups";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FollowupCall = {
  kind: "partner" | "deal";
  refId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  title: string | null;
  source: string;
  context: string | null;
  due: string | null;
  overdue: boolean;
  offer: "optely" | "sba";
};

const tomorrowIso = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/** Uppföljningssamtal överst på Idag: partnersekvensens samtal och affärer med samtal som nästa steg. */
export function FollowupCalls({ items }: { items: FollowupCall[] }) {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const visible = items.filter((i) => !done.has(i.refId));
  if (visible.length === 0) return null;
  return (
    <section aria-label="Uppföljningssamtal" className="rounded-lg border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Phone className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Uppföljningssamtal</h2>
        <span className="font-mono text-xs text-subtle">{visible.length}</span>
        <span className="ml-auto text-xs text-subtle">går tillbaka till sin kanal efter samtalet</span>
      </header>
      <ul className="divide-y divide-border">
        {visible.map((item) => (
          <FollowupRow key={item.refId} item={item} onDone={() => setDone((d) => new Set(d).add(item.refId))} />
        ))}
      </ul>
    </section>
  );
}

function FollowupRow({ item, onDone }: { item: FollowupCall; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<FollowupOutcome | null>(null);
  const SourceIcon = item.kind === "partner" ? Handshake : Kanban;

  function save(outcome: FollowupOutcome, extra: { notes?: string; until?: string; next?: string; nextChannel?: NextChannel; nextAt?: string } = {}) {
    start(async () => {
      const r = await followupCallOutcome({ kind: item.kind, refId: item.refId, outcome, ...extra });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDialog(null);
      onDone();
      toast.success(
        outcome === "no_answer"
          ? `${item.name}: nytt försök nästa ringdag`
          : `${item.name}: tillbaka till ${item.kind === "partner" ? "partnersekvensen" : "Pipeline"}`,
      );
      router.refresh();
    });
  }

  // Partner + Pratade/Möte/Nej sparas direkt; affärer behöver nästa steg eller datum.
  const needsDialog = (o: FollowupOutcome) => o === "not_now" || (item.kind === "deal" && (o === "talked" || o === "meeting"));
  const choose = (o: FollowupOutcome) => (needsDialog(o) ? setDialog(o) : save(o));

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1 basis-56">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium">{item.name}</span>
            <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-px text-[11px] text-muted-foreground">
              <SourceIcon className="size-3" /> {item.source}
            </span>
            {item.kind === "deal" && <OfferBadge offer={item.offer} />}
            {item.due && (
              <span className={cn("font-mono text-xs", item.overdue ? "text-status-yellow" : "text-subtle")}>
                {formatDate(item.due)}
                {item.overdue && " · försenat"}
              </span>
            )}
          </div>
          <div className="text-sm">{item.title}</div>
          {item.context && <div className="line-clamp-2 text-xs text-muted-foreground">{item.context}</div>}
          <div className="text-xs text-muted-foreground">{[item.contactName, item.phone].filter(Boolean).join(" · ") || "Inget telefonnummer"}</div>
        </div>
        {item.phone && (
          <Button asChild size="sm">
            <a href={`tel:${item.phone.replace(/\s+/g, "")}`}>
              <Phone /> Ring
            </a>
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => choose("no_answer")}>
          <PhoneOff /> Inget svar
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => choose("talked")}>
          Pratade – fortsätt
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => choose("meeting")}>
          <CalendarCheck /> Möte bokat
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => choose("not_now")}>
          Inte nu
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => choose("no")}>
          <X /> Nej
        </Button>
      </div>
      {dialog && <OutcomeDialog item={item} outcome={dialog} pending={pending} onClose={() => setDialog(null)} onSave={(x) => save(dialog, x)} />}
    </li>
  );
}

const CHANNELS: { value: NextChannel; label: string }[] = [
  { value: "samtal", label: "Samtal" },
  { value: "mejl", label: "Mejl" },
  { value: "möte", label: "Möte" },
];

function OutcomeDialog({
  item,
  outcome,
  pending,
  onClose,
  onSave,
}: {
  item: FollowupCall;
  outcome: FollowupOutcome;
  pending: boolean;
  onClose: () => void;
  onSave: (x: { notes?: string; until?: string; next?: string; nextChannel?: NextChannel; nextAt?: string }) => void;
}) {
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(tomorrowIso());
  const [next, setNext] = useState(outcome === "meeting" ? "Möte" : "");
  const [channel, setChannel] = useState<NextChannel>("mejl");
  const title = outcome === "not_now" ? "Inte nu" : outcome === "meeting" ? "Möte bokat" : "Pratade – nästa steg";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title} – {item.name}
          </DialogTitle>
          <DialogDescription>
            {outcome === "not_now"
              ? "Samtalet dyker upp igen det här datumet."
              : outcome === "meeting"
                ? "Mötet blir affärens nästa steg i Pipeline."
                : "Vad händer härnäst? Välj Samtal så kommer det tillbaka hit på datumet."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (outcome === "not_now") onSave({ notes, until: date });
            else if (outcome === "meeting") onSave({ notes, next, nextAt: date });
            else onSave({ notes, next, nextChannel: channel, nextAt: date });
          }}
        >
          {outcome === "talked" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fu-next">Nästa steg</Label>
                <Input id="fu-next" value={next} onChange={(e) => setNext(e.target.value)} placeholder="T.ex. Skicka offert" required autoFocus />
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kanal">
                {CHANNELS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={channel === c.value}
                    onClick={() => setChannel(c.value)}
                    className={cn(
                      "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2",
                      channel === c.value && "border-brand/50 bg-brand/10 text-foreground",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {outcome === "meeting" && (
            <div className="space-y-1.5">
              <Label htmlFor="fu-next">Möte</Label>
              <Input id="fu-next" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="fu-date">{outcome === "not_now" ? "Hör av dig igen" : outcome === "meeting" ? "Mötesdag" : "Datum"}</Label>
            <Input id="fu-date" type="date" min={tomorrowIso()} value={date} onChange={(e) => setDate(e.target.value)} required={outcome === "not_now"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-notes">Anteckning</Label>
            <Textarea id="fu-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vad sa de?" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              Spara
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
