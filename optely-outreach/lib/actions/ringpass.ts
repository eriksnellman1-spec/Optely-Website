"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { dispatchEmails } from "@/lib/outbound/dispatch";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type Outcome =
  | "no_answer"
  | "callback"
  | "interested"
  | "meeting_booked"
  | "not_interested"
  | "wrong_person"
  | "do_not_call";

const OUTCOMES: Outcome[] = [
  "no_answer",
  "callback",
  "interested",
  "meeting_booked",
  "not_interested",
  "wrong_person",
  "do_not_call",
];

export type OutcomeInput = {
  taskId: string;
  outcome: Outcome;
  notes?: string;
  voicemail?: boolean;
  /** callback: { due_at } · interested: { times: ISO[] } · meeting_booked: { starts_at, minutes, location }
   *  not_interested: { months: 0 | 3 | 6 } · wrong_person: { first_name, last_name, role, phone, email } */
  payload?: Record<string, string | number | string[] | undefined>;
};

const weekday = new Intl.DateTimeFormat("sv-FI", { timeZone: "Europe/Helsinki", weekday: "long" });
const dayMonth = new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", day: "numeric", month: "numeric" });
const hhmm = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "tisdag 4.11. kl. 10:00" */
function formatSlot(d: Date) {
  return `${weekday.format(d)} ${dayMonth.format(d)} kl. ${hhmm.format(d).replace(".", ":")}`;
}

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MESSAGES: Record<Outcome, string> = {
  no_answer: "Loggat – nästa steg är schemalagt",
  callback: "Ring tillbaka är bokat",
  interested: "Varm! Mejl med mötestider skickat",
  meeting_booked: "Möte bokat och bekräftelse skickad",
  not_interested: "Loggat – bolaget pausas",
  wrong_person: "Ny kontakt sparad – Mejl 1 väntar i Gatekeeper",
  do_not_call: "Bolaget kontaktas inte igen",
};

export async function logCallOutcome(
  input: OutcomeInput,
): Promise<ActionResult<{ message: string; emailsQueued: number; emailsFailed: number }>> {
  if (!OUTCOMES.includes(input.outcome)) return { ok: false, error: "Okänt utfall." };
  const p = input.payload ?? {};
  const payload: Record<string, Json> = {};

  switch (input.outcome) {
    case "callback": {
      const due = parseDate(p.due_at);
      if (!due) return { ok: false, error: "Välj när du ska ringa tillbaka." };
      payload.due_at = due.toISOString();
      break;
    }
    case "interested": {
      const times = (Array.isArray(p.times) ? p.times : []).map(parseDate).filter((d): d is Date => d !== null);
      if (times.length < 2) return { ok: false, error: "Välj två mötestider." };
      times.sort((a, b) => a.getTime() - b.getTime());
      payload.times_text = times.map((d) => `• ${formatSlot(d)}`).join("\n");
      break;
    }
    case "meeting_booked": {
      const start = parseDate(p.starts_at);
      if (!start) return { ok: false, error: "Välj tid för mötet." };
      const minutes = Number(p.minutes) > 0 ? Number(p.minutes) : 45;
      payload.starts_at = start.toISOString();
      payload.ends_at = new Date(start.getTime() + minutes * 60_000).toISOString();
      payload.when_text = formatSlot(start);
      payload.location = typeof p.location === "string" ? p.location : "";
      break;
    }
    case "not_interested": {
      const months = Number(p.months);
      payload.months = months === 3 || months === 6 ? months : 0;
      break;
    }
    case "wrong_person": {
      const first = typeof p.first_name === "string" ? p.first_name.trim() : "";
      if (!first) return { ok: false, error: "Fyll i förnamn på rätt person." };
      const email = typeof p.email === "string" ? p.email.trim() : "";
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Ogiltig e-postadress." };
      for (const k of ["first_name", "last_name", "role", "phone", "email"] as const) {
        if (typeof p[k] === "string") payload[k] = p[k];
      }
      break;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_call_outcome", {
    p_task_id: input.taskId,
    p_outcome: input.outcome,
    p_notes: input.notes?.trim() || undefined,
    p_voicemail: Boolean(input.voicemail),
    p_payload: payload,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("redan hanterad")) return { ok: false, error: "Uppgiften är redan hanterad." };
    if (msg.includes("do_not_contact")) return { ok: false, error: "Kontakten har avregistrerat sig – inget mejl skickades." };
    if (msg.includes("23505") || msg.includes("duplicate")) return { ok: false, error: "Kontakten finns redan (samma e-post)." };
    return { ok: false, error: msg.length < 140 ? msg : "Kunde inte spara utfallet. Försök igen." };
  }

  const emailIds =
    data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.email_ids)
      ? data.email_ids.filter((x): x is string => typeof x === "string")
      : [];

  let emailsQueued = 0;
  let emailsFailed = 0;
  if (emailIds.length) {
    try {
      const r = await dispatchEmails(supabase, emailIds);
      emailsQueued = r.queued;
      emailsFailed = r.failed;
    } catch {
      // Mejlen ligger kvar som 'approved' och plockas upp av nästa cron-körning.
      emailsFailed = emailIds.length;
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { message: MESSAGES[input.outcome], emailsQueued, emailsFailed } };
}
