"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Mail, Pencil, Phone, Plus } from "lucide-react";
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
import { updateDealNextStep, type NextChannel } from "@/lib/actions/followups";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICON = { samtal: Phone, mejl: Mail, möte: CalendarCheck } as const;
const CHANNELS: { value: NextChannel; label: string }[] = [
  { value: "samtal", label: "Samtal" },
  { value: "mejl", label: "Mejl" },
  { value: "möte", label: "Möte" },
];

const helsinkiDate = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(new Date(iso));

/** Nästa steg på ett Pipeline-kort, med kanal. Klick öppnar redigering. */
export function NextStepEdit({
  dealId,
  companyName,
  next,
  at,
  channel,
  own,
}: {
  dealId: string;
  companyName: string;
  next: string | null;
  at: string | null;
  channel: string | null;
  own: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [text, setText] = useState(own ? (next ?? "") : "");
  const [ch, setCh] = useState<NextChannel>(channel === "samtal" || channel === "möte" ? channel : channel === "mejl" ? "mejl" : "samtal");
  const [date, setDate] = useState(own && at ? helsinkiDate(at) : "");
  const Icon = channel && channel in ICON ? ICON[channel as keyof typeof ICON] : null;
  const overdue = at ? helsinkiDate(at) < helsinkiDate(new Date().toISOString()) : false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ändra nästa steg"
        className="group mt-1.5 flex w-full items-start gap-1.5 rounded text-left text-xs hover:bg-surface-2"
      >
        {next ? (
          <span className={cn("min-w-0 flex-1", overdue ? "text-status-yellow" : "text-foreground")}>
            {Icon && <Icon className="mr-1 inline size-3 align-[-1px]" />}
            {next}
            {at && <span className="ml-1 font-mono text-subtle">{formatDate(at)}</span>}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-subtle">
            <Plus className="size-3" /> Nästa steg
          </span>
        )}
        <Pencil className="mt-0.5 size-3 shrink-0 text-subtle opacity-0 group-hover:opacity-100" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nästa steg – {companyName}</DialogTitle>
            <DialogDescription>Välj Samtal så dyker det upp under Uppföljningssamtal på Idag den dagen.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await updateDealNextStep({ dealId, next: text, channel: ch, at: date || null });
                if (!r.ok) toast.error(r.error);
                else {
                  toast.success(text.trim() ? "Nästa steg sparat" : "Nästa steg borttaget");
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor={`ns-${dealId}`}>Vad</Label>
              <Input id={`ns-${dealId}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="T.ex. Ring om offerten" autoFocus />
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kanal">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={ch === c.value}
                  onClick={() => setCh(c.value)}
                  className={cn(
                    "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2",
                    ch === c.value && "border-brand/50 bg-brand/10 text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`nsd-${dealId}`}>Datum</Label>
              <Input id={`nsd-${dealId}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={pending}>
                Spara
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
