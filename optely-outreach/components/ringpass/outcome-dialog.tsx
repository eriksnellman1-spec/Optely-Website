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
import { Textarea } from "@/components/ui/textarea";
import type { OutcomeInput } from "@/lib/actions/ringpass";
import type { Outcome } from "@/lib/sequence";
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
function nextWeekday(from: Date) {
  const d = new Date(from);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}
function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return at(d, 9);
}

const META: Partial<Record<Outcome, { title: string; description: string }>> = {
  booked: {
    title: "Bokat",
    description: "Behovssamtalet sparas. Bekräftelse-SMS köas (mejl om mobilnummer saknas) och kalenderhändelsen läggs i Att göra.",
  },
  call_later: { title: "Ring senare", description: "Samtalet läggs exakt vid den tid du väljer." },
  wrong_person: {
    title: "Fel person",
    description: "Rätt person sparas som ny huvudkontakt och hamnar överst i kön direkt.",
  },
  send_info: {
    title: "Skicka info",
    description: "Mejlet skickas, en LinkedIn-påminnelse läggs i Att göra och ett nytt samtal läggs om 7 dagar.",
  },
  not_now: {
    title: "Nej, inte nu",
    description: "Bolaget blir Vilande och samtalet ligger färdigt till tidpunkten de angav.",
  },
  no_need: { title: "Nej, inget behov", description: "Status Nej. Alla kanaler stoppas för bolaget." },
  do_not_call: {
    title: "Ring ej",
    description: "Kontakta ej i alla kanaler, permanent. Inga fler samtal, mejl eller SMS.",
  },
};

export function OutcomeDialog({
  outcome,
  item,
  sendInfoTemplate,
  onCancel,
  onSubmit,
}: {
  outcome: Outcome | null;
  item: QueueItem;
  sendInfoTemplate: string;
  onCancel: () => void;
  onSubmit: (outcome: Outcome, payload?: Payload) => void;
}) {
  const open = outcome !== null && outcome !== "no_answer";
  const meta = outcome ? META[outcome] : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className={cn("sm:max-w-md", outcome === "send_info" && "sm:max-w-xl")}>
        <DialogHeader>
          <DialogTitle>
            {meta?.title} · <span className="text-muted-foreground">{item.companyName}</span>
          </DialogTitle>
          <DialogDescription>{meta?.description}</DialogDescription>
        </DialogHeader>
        {open && outcome && (
          <Body
            key={`${item.taskId}-${outcome}`}
            outcome={outcome}
            item={item}
            sendInfoTemplate={sendInfoTemplate}
            onCancel={onCancel}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function splitTemplate(template: string, item: QueueItem) {
  const filled = template
    .replaceAll("{{förnamn}}", item.firstName ?? "")
    .replaceAll("{{bolag}}", item.companyName);
  const [first, ...rest] = filled.split("\n");
  const hasSubject = /^\s*Ämne:/i.test(first);
  return {
    subject: hasSubject ? first.replace(/^\s*Ämne:\s*/i, "").trim() : "",
    body: (hasSubject ? rest.join("\n") : filled).trim(),
  };
}

function Body({
  outcome,
  item,
  sendInfoTemplate,
  onCancel,
  onSubmit,
}: {
  outcome: Outcome;
  item: QueueItem;
  sendInfoTemplate: string;
  onCancel: () => void;
  onSubmit: (outcome: Outcome, payload?: Payload) => void;
}) {
  const [now] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const d1 = nextWeekday(now);

  // Bokat
  const [meetingAt, setMeetingAt] = useState(toLocalInput(at(d1, 10)));
  const [minutes, setMinutes] = useState("20");
  const [location, setLocation] = useState("telefon");

  // Ring senare
  const laterPresets = [
    { label: "Om 1 timme", date: new Date(Math.ceil((now.getTime() + 3600_000) / 900_000) * 900_000) },
    { label: "I eftermiddag 15:00", date: at(now, 15) },
    { label: "I morgon 09:00", date: at(d1, 9) },
  ].filter((p) => p.date > now);
  const [laterAt, setLaterAt] = useState(toLocalInput(laterPresets[0]?.date ?? at(d1, 9)));

  // Nej, inte nu
  const notNowPresets = [
    { label: "Om 1 månad", date: addMonths(now, 1) },
    { label: "Om 3 månader", date: addMonths(now, 3) },
    { label: "Om 6 månader", date: addMonths(now, 6) },
  ];
  const [notNowAt, setNotNowAt] = useState(toLocalInput(notNowPresets[1].date));

  // Fel person
  const [person, setPerson] = useState({ first_name: "", last_name: "", role: "", phone: "" });

  // Skicka info – mallen förifylld, justeras varje gång
  const [mail, setMail] = useState(() => splitTemplate(sendInfoTemplate, item));

  // Siffror väljer snabbval i "Ring senare" och "Nej, inte nu".
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const i = Number(e.key) - 1;
      if (outcome === "call_later" && laterPresets[i]) {
        e.preventDefault();
        setLaterAt(toLocalInput(laterPresets[i].date));
      } else if (outcome === "not_now" && notNowPresets[i]) {
        e.preventDefault();
        setNotNowAt(toLocalInput(notNowPresets[i].date));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    switch (outcome) {
      case "booked":
        if (!meetingAt) return setError("Välj tid.");
        return onSubmit("booked", { starts_at: fromLocalInput(meetingAt), minutes: Number(minutes), location });
      case "call_later":
        if (!laterAt) return setError("Välj tid.");
        return onSubmit("call_later", { due_at: fromLocalInput(laterAt) });
      case "not_now":
        if (!notNowAt) return setError("Välj tidpunkt.");
        return onSubmit("not_now", { due_at: fromLocalInput(notNowAt) });
      case "wrong_person":
        if (!person.first_name.trim() || !person.phone.trim()) return setError("Namn och nummer krävs.");
        return onSubmit("wrong_person", person);
      case "send_info":
        if (!item.email) return setError("Kontakten saknar e-post – lägg till den i Kontakter först.");
        if (!mail.body.trim()) return setError("Mejlet är tomt.");
        return onSubmit("send_info", mail);
      case "no_need":
      case "do_not_call":
        return onSubmit(outcome);
    }
  }

  const confirmOnly = outcome === "no_need" || outcome === "do_not_call";

  return (
    <form onSubmit={submit} className="space-y-4">
      {outcome === "booked" && (
        <>
          <Field label="Tid för behovssamtalet">
            <Input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field label="Längd">
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-surface px-2 text-sm"
              >
                <option value="20">20 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
              </select>
            </Field>
            <Field label="Var">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="telefon, Teams, hos kunden…" />
            </Field>
          </div>
          <p className="text-xs text-subtle">
            Bekräftelse:{" "}
            {item.phone ? `SMS till ${item.phone}` : item.email ? `mejl till ${item.email}` : "kontakten saknar nummer och e-post"}
          </p>
        </>
      )}

      {outcome === "call_later" && (
        <>
          <Presets presets={laterPresets} value={laterAt} onPick={setLaterAt} />
          <Field label="Tid">
            <Input type="datetime-local" value={laterAt} onChange={(e) => setLaterAt(e.target.value)} />
          </Field>
        </>
      )}

      {outcome === "not_now" && (
        <>
          <Presets presets={notNowPresets} value={notNowAt} onPick={setNotNowAt} />
          <Field label="Hör av dig">
            <Input type="datetime-local" value={notNowAt} onChange={(e) => setNotNowAt(e.target.value)} />
          </Field>
        </>
      )}

      {outcome === "wrong_person" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Förnamn">
            <Input value={person.first_name} onChange={(e) => setPerson({ ...person, first_name: e.target.value })} autoFocus />
          </Field>
          <Field label="Efternamn">
            <Input value={person.last_name} onChange={(e) => setPerson({ ...person, last_name: e.target.value })} />
          </Field>
          <Field label="Nummer">
            <Input type="tel" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
          </Field>
          <Field label="Roll">
            <Input value={person.role} onChange={(e) => setPerson({ ...person, role: e.target.value })} placeholder="VD, ägare…" />
          </Field>
        </div>
      )}

      {outcome === "send_info" && (
        <>
          <p className="text-xs text-subtle">Till: {item.email ?? "– kontakten saknar e-post –"}</p>
          <Field label="Ämne">
            <Input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} />
          </Field>
          <Field label="Text">
            <Textarea
              rows={10}
              value={mail.body}
              onChange={(e) => setMail({ ...mail, body: e.target.value })}
              autoFocus
              className="text-sm leading-6"
            />
          </Field>
        </>
      )}

      {confirmOnly && (
        <p className="text-sm">
          {outcome === "do_not_call"
            ? `${item.contactName ?? "Kontakten"} på ${item.companyName} kontaktas aldrig igen.`
            : `${item.companyName} får status Nej.`}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-status-red">
          {error}
        </p>
      )}

      <DialogFooter className="pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Avbryt <Kbd className="ml-1">Esc</Kbd>
        </Button>
        {/* Utan textfält ska Enter bekräfta – inte träffa "Avbryt". */}
        <Button
          type="submit"
          variant={outcome === "do_not_call" || outcome === "no_need" ? "destructive" : "default"}
          autoFocus={confirmOnly || outcome === "call_later" || outcome === "not_now"}
        >
          {outcome === "send_info" ? "Skicka" : "Spara"}
          {outcome !== "send_info" && <Kbd className="ml-1 border-black/20 bg-black/10 text-current">↵</Kbd>}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Presets({
  presets,
  value,
  onPick,
}: {
  presets: { label: string; date: Date }[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((p, i) => (
        <Button
          key={p.label}
          type="button"
          size="sm"
          variant={value === toLocalInput(p.date) ? "secondary" : "outline"}
          onClick={() => onPick(toLocalInput(p.date))}
        >
          <Kbd>{i + 1}</Kbd>
          {p.label}
        </Button>
      ))}
    </div>
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
