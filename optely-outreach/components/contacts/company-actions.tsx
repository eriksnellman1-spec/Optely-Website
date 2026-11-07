"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
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
import { changeOffer, logLinkedin } from "@/lib/actions/companies";
import { OFFER_LABEL, type Offer } from "@/lib/offer";
import { cn } from "@/lib/utils";

/** Byte av erbjudande. Spärren i databasen ger ett tydligt felmeddelande. */
export function OfferChanger({ companyId, offer }: { companyId: string; offer: Offer }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pick(next: Offer) {
    if (next === offer) return;
    setError(null);
    start(async () => {
      const r = await changeOffer(companyId, next);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success(`Erbjudandet är nu ${OFFER_LABEL[next]}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <div role="radiogroup" aria-label="Erbjudande" className="flex w-fit rounded-md border border-border p-0.5 text-xs">
        {(["optely", "sba"] as const).map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={offer === o}
            disabled={pending}
            onClick={() => pick(o)}
            className={cn(
              "h-6 rounded px-3 font-medium text-muted-foreground",
              offer === o && (o === "optely" ? "bg-brand/15 text-brand" : "bg-status-blue/15 text-status-blue"),
            )}
          >
            {OFFER_LABEL[o]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="max-w-sm text-xs text-status-red">
          {error}
        </p>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const localNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function LogLinkedinButton({
  companyId,
  contacts,
}: {
  companyId: string;
  contacts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [note, setNote] = useState("");
  const [at, setAt] = useState(localNow);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await logLinkedin({ companyId, contactId, direction, note, sentAt: new Date(at).toISOString() });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success(direction === "in" ? "LinkedIn-svar loggat – övriga kanaler stoppade" : "LinkedIn-meddelande loggat");
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setAt(localNow()); setOpen(true); }}>
        <MessageSquarePlus /> Logga LinkedIn
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logga LinkedIn</DialogTitle>
            <DialogDescription>DM görs i LinkedIn – här sparas att det hände. Ett svar stoppar övriga kanaler.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="flex w-fit rounded-md border border-border p-0.5 text-xs" role="radiogroup" aria-label="Riktning">
              {(
                [
                  ["out", "Jag skickade"],
                  ["in", "De svarade"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={direction === v}
                  onClick={() => setDirection(v)}
                  className={cn("h-6 rounded px-3 text-muted-foreground", direction === v && "bg-accent text-foreground")}
                >
                  {label}
                </button>
              ))}
            </div>
            {contacts.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="li-contact">Kontakt</Label>
                <select
                  id="li-contact"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-surface px-2 text-sm"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="li-at">När</Label>
              <Input id="li-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="li-note">Anteckning</Label>
              <Textarea id="li-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Vad skrev du / vad svarade de?" />
            </div>
            {error && (
              <p role="alert" className="text-xs text-status-red">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Sparar…" : "Logga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
