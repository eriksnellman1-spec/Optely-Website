"use client";

import { useEffect, useState } from "react";

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
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import type { Outcome, OutcomeInput } from "@/lib/actions/ringpass";
import { cn } from "@/lib/utils";
import type { QueueItem } from "./ringpass-view";

type Payload = NonNullable<OutcomeInput["payload"]>;

const pad = (n: number) => String(n).padStart(2, "0");
/** Date → värde för <input type="datetime-local"> i webbläsarens tidszon. */
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

function at(day: Date, h: number, m = 0) {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}
/** Nästa vardag (mån–fre) efter `from`. */
function nextWeekday(from: Date) {
  const d = new Date(from);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

const TITLES: Partial<Record<Outcome, { title: string; description: string }>> = {
  callback: { title: "Ring tillbaka", description: "Samtalet läggs överst i kön vid vald tid." },
  interested: {
    title: "Intresserad",
    description: "Bolaget blir varmt och får ett mejl med två mötestider. En uppföljning bokas.",
  },
  meeting_booked: { title: "Möte bokat", description: "Mötet sparas och en bekräftelse mejlas till kontakten." },
  not_interested: { title: "Inte intresserad", description: "Ska vi höra av oss senare, eller släppa bolaget?" },
  wrong_person: {
    title: "Fel person",
    description: "Lägg till rätt person. Sekvensen börjar om med Mejl 1, som väntar på ditt godkännande i Gatekeeper.",
  },
  do_not_call: {
    title: "Ring inte igen",
    description: "Kontakten och bolaget markeras 'kontakta inte'. Inga fler samtal eller mejl skickas.",
  },
};

export function OutcomeDialog({
  outcome,
  item,
  stepLabel,
  dueLabel,
  onCancel,
  onSubmit,
}: {
  outcome: Outcome | null;
  item: QueueItem;
  stepLabel: string | null;
  dueLabel: string;
  onCancel: () => void;
  onSubmit: (outcome: Outcome, payload?: Payload) => void;
}) {
  const open = outcome !== null && outcome !== "no_answer";
  const meta = outcome ? TITLES[outcome] : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {meta?.title} · <span className="text-muted-foreground">{item.companyName}</span>
          </DialogTitle>
          <DialogDescription>{meta?.description}</DialogDescription>
        </DialogHeader>
        {open && outcome && (
          <Body key={`${item.taskId}-${outcome}`} outcome={outcome} item={item} onCancel={onCancel} onSubmit={onSubmit} />
        )}
        <p className="sr-only">
          {stepLabel} {dueLabel}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Body({
  outcome,
  item,
  onCancel,
  onSubmit,
}: {
  outcome: Outcome;
  item: QueueItem;
  onCancel: () => void;
  onSubmit: (outcome: Outcome, payload?: Payload) => void;
}) {
  const [now] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  // --- Ring tillbaka
  const presets = [
    { label: "Om 2 timmar", date: new Date(Math.ceil((now.getTime() + 2 * 3600_000) / 900_000) * 900_000) },
    { label: "I morgon 09:00", date: at(nextWeekday(now), 9) },
    { label: "Om en vecka", date: at(new Date(now.getTime() + 7 * 86_400_000), 9) },
  ];
  const [callbackAt, setCallbackAt] = useState(toLocalInput(presets[0].date));

  // --- Intresserad: två tider
  const d1 = nextWeekday(now);
  const d2 = nextWeekday(d1);
  const [time1, setTime1] = useState(toLocalInput(at(d1, 10)));
  const [time2, setTime2] = useState(toLocalInput(at(d2, 13)));

  // --- Möte bokat
  const [meetingAt, setMeetingAt] = useState(toLocalInput(at(d1, 10)));
  const [minutes, setMinutes] = useState("45");
  const [location, setLocation] = useState("Teams");

  // --- Fel person
  const [person, setPerson] = useState({ first_name: "", last_name: "", role: "", phone: "", email: "" });

  // Sifferval i "Inte intresserad" och Enter i bekräftelsen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (outcome === "not_interested" && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        onSubmit("not_interested", { months: e.key === "1" ? 3 : e.key === "2" ? 6 : 0 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [outcome, onSubmit]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (outcome === "callback") {
      if (!callbackAt) return setError("Välj en tid.");
      onSubmit("callback", { due_at: fromLocalInput(callbackAt) });
    } else if (outcome === "interested") {
      if (!time1 || !time2) return setError("Välj två tider.");
      if (time1 === time2) return setError("Tiderna ska vara olika.");
      onSubmit("interested", { times: [fromLocalInput(time1), fromLocalInput(time2)] });
    } else if (outcome === "meeting_booked") {
      if (!meetingAt) return setError("Välj tid för mötet.");
      onSubmit("meeting_booked", { starts_at: fromLocalInput(meetingAt), minutes: Number(minutes), location });
    } else if (outcome === "wrong_person") {
      if (!person.first_name.trim()) return setError("Förnamn krävs.");
      onSubmit("wrong_person", person);
    } else if (outcome === "do_not_call") {
      onSubmit("do_not_call");
    }
  }

  const footer = (label: string, destructive = false) => (
    <DialogFooter className="pt-1">
      <Button type="button" variant="ghost" onClick={onCancel}>
        Avbryt <Kbd className="ml-1">Esc</Kbd>
      </Button>
      {/* Utan textfält (bekräftelse) ska Enter bekräfta – inte träffa "Avbryt". */}
      <Button type="submit" variant={destructive ? "destructive" : "default"} autoFocus={outcome === "do_not_call"}>
        {label} <Kbd className="ml-1 border-black/20 bg-black/10 text-current">↵</Kbd>
      </Button>
    </DialogFooter>
  );

  if (outcome === "not_interested") {
    const options = [
      { key: "1", months: 3, label: "Hör av dig om 3 månader" },
      { key: "2", months: 6, label: "Hör av dig om 6 månader" },
      { key: "3", months: 0, label: "Släpp bolaget (förlorad)" },
    ];
    return (
      <div className="grid gap-2">
        {options.map((o, i) => (
          <Button
            key={o.key}
            autoFocus={i === 0}
            variant="outline"
            className={cn("h-10 justify-start", o.months === 0 && "text-status-red")}
            onClick={() => onSubmit("not_interested", { months: o.months })}
          >
            <Kbd>{o.key}</Kbd>
            {o.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {outcome === "callback" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Button
                key={p.label}
                type="button"
                size="sm"
                variant={callbackAt === toLocalInput(p.date) ? "secondary" : "outline"}
                onClick={() => setCallbackAt(toLocalInput(p.date))}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Field label="Tid">
            <Input type="datetime-local" value={callbackAt} onChange={(e) => setCallbackAt(e.target.value)} autoFocus />
          </Field>
          {footer("Boka ring tillbaka")}
        </>
      )}

      {outcome === "interested" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Förslag 1">
              <Input type="datetime-local" value={time1} onChange={(e) => setTime1(e.target.value)} autoFocus />
            </Field>
            <Field label="Förslag 2">
              <Input type="datetime-local" value={time2} onChange={(e) => setTime2(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-subtle">
            Mejlet går till {item.email ?? "kontakten (e-post saknas!)"} enligt mallen &quot;Två mötestider&quot; i
            Företagshjärnan.
          </p>
          {footer("Skicka tider")}
        </>
      )}

      {outcome === "meeting_booked" && (
        <>
          <Field label="Start">
            <Input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field label="Längd">
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-surface px-2 text-sm"
              >
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </Field>
            <Field label="Plats">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Teams, hos kunden…" />
            </Field>
          </div>
          {footer("Spara möte")}
        </>
      )}

      {outcome === "wrong_person" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Förnamn">
              <Input
                value={person.first_name}
                onChange={(e) => setPerson({ ...person, first_name: e.target.value })}
                autoFocus
                required
              />
            </Field>
            <Field label="Efternamn">
              <Input value={person.last_name} onChange={(e) => setPerson({ ...person, last_name: e.target.value })} />
            </Field>
            <Field label="Roll">
              <Input
                value={person.role}
                onChange={(e) => setPerson({ ...person, role: e.target.value })}
                placeholder="VD, inköp…"
              />
            </Field>
            <Field label="Telefon">
              <Input type="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
            </Field>
            <Field label="E-post" className="col-span-2">
              <Input type="email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
            </Field>
          </div>
          {footer("Spara och börja om")}
        </>
      )}

      {outcome === "do_not_call" && (
        <>
          <p className="text-sm">
            {item.contactName ?? "Kontakten"} på {item.companyName} kontaktas aldrig igen.
          </p>
          {footer("Ring inte igen", true)}
        </>
      )}

      {error && (
        <p role="alert" className="text-xs text-status-red">
          {error}
        </p>
      )}
    </form>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
