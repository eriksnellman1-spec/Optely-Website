"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Mail, MailCheck, MailOpen, MessageSquareReply, Phone, PhoneCall, SkipForward, X } from "lucide-react";
import { toast } from "sonner";

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
import { handlePartner, logPartnerCall, logPartnerMail, skipPartnerStep, type PartnerAction } from "@/lib/actions/partners";
import type { ActionResult } from "@/lib/actions/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Nästa steg för en partner (ur vyn partner_next_step). */
export type NextStep = {
  partnerId: string;
  name: string;
  status: string;
  step: string | null;
  label: string | null;
  channel: string | null;
  due: string | null;
  overdue: boolean;
  threadId: string | null;
  replySubject: string | null;
  replySnippet: string | null;
};

const ICON = { samtal: Phone, mejl: Mail, "mejl/samtal": MailOpen, valfri: CalendarCheck } as const;

export function StepCell({ step }: { step: NextStep }) {
  if (!step.step) return <span className="text-xs text-subtle">Avslutad</span>;
  const reply = step.step === "reply";
  const Icon = reply ? MessageSquareReply : (ICON[step.channel as keyof typeof ICON] ?? Mail);
  return (
    <div className="min-w-0">
      <div className={cn("flex items-center gap-1.5 text-xs", reply ? "font-medium text-status-green" : step.overdue && "text-status-yellow")}>
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{step.label}</span>
        {!reply && step.due && step.status !== "ny" && <span className="shrink-0 font-mono">{formatDate(step.due)}</span>}
        {step.overdue && !reply && <span className="shrink-0">· försenat</span>}
      </div>
      {reply && (step.replySubject || step.replySnippet) && (
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {[step.replySubject, step.replySnippet].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(ok);
        after?.();
        router.refresh();
      }
    });
  return { pending, run };
}

/** Steg som görs klara med ett mejl (även "ny kontakt", som kan vara mejl eller samtal). */
const isMailStep = (s: NextStep) =>
  s.step === "first_mail" || s.channel === "mejl" || s.channel === "mejl/samtal";

const tomorrowIso = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/** Knappar per partner: svar (Boka möte, Ring upp, Inte nu, Nej) eller Gmail-tråd, Logga samtal, Hoppa över. */
export function StepActions({ step, compact = false }: { step: NextStep; compact?: boolean }) {
  const { pending, run } = useRun();
  const [dialog, setDialog] = useState<"call" | "not_now" | null>(null);
  const gmail = step.threadId ? `https://mail.google.com/mail/u/0/#all/${step.threadId}` : null;

  const handle = (action: PartnerAction, label: string, until?: string) =>
    run(() => handlePartner(step.partnerId, action, until), `${step.name}: ${label}`, () => setDialog(null));

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {gmail && (
        <Button asChild size="sm" variant="ghost" title="Öppna tråden i Gmail">
          <a href={gmail} target="_blank" rel="noreferrer">
            <Mail /> {!compact && "Gmail"}
          </a>
        </Button>
      )}
      {step.step === "reply" ? (
        <>
          <Button size="sm" disabled={pending} onClick={() => handle("meeting", "möte bokat – aktiv partner")}>
            <CalendarCheck /> Boka möte
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => handle("call", "ring upp i dag")}>
            <PhoneCall /> Ring upp
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setDialog("not_now")}>
            Inte nu
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => handle("no", "avslutad")}>
            <X /> Nej
          </Button>
        </>
      ) : (
        step.step && (
          <>
            {isMailStep(step) && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                title="Markera mejlet som skickat"
                onClick={() => run(() => logPartnerMail(step.partnerId), `${step.name}: mejl skickat`)}
              >
                <MailCheck /> {!compact && "Mejl skickat"}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDialog("call")} title="Logga samtal">
              <Phone /> {!compact && "Logga samtal"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              title="Hoppa över steget"
              onClick={() => run(() => skipPartnerStep(step.partnerId), `${step.name}: steget överhoppat`)}
            >
              <SkipForward /> {!compact && "Hoppa över"}
            </Button>
          </>
        )
      )}

      <NotNowDialog
        open={dialog === "not_now"}
        name={step.name}
        pending={pending}
        onClose={() => setDialog(null)}
        onSave={(until) => handle("not_now", `vilande till ${formatDate(until)}`, until)}
      />
      {dialog === "call" && <CallDialog step={step} onClose={() => setDialog(null)} />}
    </div>
  );
}

function NotNowDialog({
  open,
  name,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  name: string;
  pending: boolean;
  onClose: () => void;
  onSave: (until: string) => void;
}) {
  const [until, setUntil] = useState(tomorrowIso());
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inte nu – {name}</DialogTitle>
          <DialogDescription>Partnern vilar till datumet. Då dyker steget &quot;Ny kontakt med något nytt&quot; upp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="nn-until">Hör av dig igen</Label>
          <Input id="nn-until" type="date" min={tomorrowIso()} value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
          <Button disabled={pending || !until} onClick={() => onSave(until)}>
            Spara
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const RESULTS = [
  { value: "continue", label: "Fortsätt sekvensen" },
  { value: "meeting", label: "Möte bokat" },
  { value: "not_now", label: "Inte nu" },
  { value: "no", label: "Nej" },
] as const;

function CallDialog({ step, onClose }: { step: NextStep; onClose: () => void }) {
  const { pending, run } = useRun();
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<(typeof RESULTS)[number]["value"]>("continue");
  const [until, setUntil] = useState(tomorrowIso());
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logga samtal – {step.name}</DialogTitle>
          <DialogDescription>Samtalet gör samtalssteget klart. Välj hur det gick.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Resultat">
            {RESULTS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={result === r.value}
                onClick={() => setResult(r.value)}
                className={cn(
                  "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2",
                  result === r.value && "border-brand/50 bg-brand/10 text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {result === "not_now" && (
            <div className="space-y-1.5">
              <Label htmlFor="call-until">Hör av dig igen</Label>
              <Input id="call-until" type="date" min={tomorrowIso()} value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="call-notes">Anteckning</Label>
            <Textarea id="call-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vad sa de?" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () => logPartnerCall({ partnerId: step.partnerId, notes, result, until: result === "not_now" ? until : undefined }),
                "Samtalet är loggat",
                onClose,
              )
            }
          >
            Spara samtal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
