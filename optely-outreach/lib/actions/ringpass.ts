"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { dispatchEmails } from "@/lib/outbound/dispatch";
import { OUTCOMES, type Outcome } from "@/lib/sequence";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type { Outcome };

export type OutcomeInput = {
  taskId: string;
  outcome: Outcome;
  notes?: string;
  voicemail?: boolean;
  /** booked: { starts_at, minutes, location } · call_later/not_now: { due_at } · send_info: { subject, body }
   *  wrong_person: { first_name, last_name, role, phone } */
  payload?: Record<string, string | number | undefined>;
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
  booked: "Behovssamtal bokat – bekräftelse köad",
  no_answer: "Loggat – nästa försök är schemalagt",
  call_later: "Ring senare är inlagt",
  wrong_person: "Rätt person sparad – ligger överst i kön",
  send_info: "Mejlet skickat, LinkedIn-påminnelse och samtal om 7 dagar inlagda",
  not_now: "Vilande – samtalet ligger färdigt till datumet",
  no_need: "Status Nej – allt stoppat",
  do_not_call: "Kontakta ej – i alla kanaler",
};

export async function logCallOutcome(
  input: OutcomeInput,
): Promise<ActionResult<{ message: string; emailsQueued: number; emailsFailed: number }>> {
  if (!OUTCOMES.includes(input.outcome)) return { ok: false, error: "Okänt utfall." };
  const p = input.payload ?? {};
  const payload: Record<string, Json> = {};

  switch (input.outcome) {
    case "booked": {
      const start = parseDate(p.starts_at);
      if (!start) return { ok: false, error: "Välj tid för behovssamtalet." };
      const minutes = Number(p.minutes) > 0 ? Number(p.minutes) : 20;
      payload.starts_at = start.toISOString();
      payload.ends_at = new Date(start.getTime() + minutes * 60_000).toISOString();
      payload.when_text = formatSlot(start);
      payload.location = typeof p.location === "string" ? p.location : "";
      break;
    }
    case "call_later":
    case "not_now": {
      const due = parseDate(p.due_at);
      if (!due) return { ok: false, error: "Välj en tidpunkt." };
      payload.due_at = due.toISOString();
      break;
    }
    case "send_info": {
      const body = typeof p.body === "string" ? p.body.trim() : "";
      if (!body) return { ok: false, error: "Mejlet är tomt." };
      payload.subject = typeof p.subject === "string" ? p.subject.trim() : "";
      payload.body = body;
      break;
    }
    case "wrong_person": {
      const first = typeof p.first_name === "string" ? p.first_name.trim() : "";
      const phone = typeof p.phone === "string" ? p.phone.trim() : "";
      if (!first || !phone) return { ok: false, error: "Fyll i namn och nummer till rätt person." };
      for (const k of ["first_name", "last_name", "role", "phone"] as const) {
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

// ---------------------------------------------------------------------------
// "Att göra" i Ringpasset: SMS, kalender och LinkedIn tills fas F/G automatiserar dem
// ---------------------------------------------------------------------------

export async function markSmsSent(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sms_messages")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { ok: false, error: "Kunde inte markera SMS:et." };
  revalidatePath("/ringpass");
  return { ok: true, data: undefined };
}

export async function cancelSms(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("sms_messages").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
  if (error) return { ok: false, error: "Kunde inte stryka SMS:et." };
  revalidatePath("/ringpass");
  return { ok: true, data: undefined };
}

export async function markCalendarAdded(meetingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ calendar_added_at: new Date().toISOString() })
    .eq("id", meetingId);
  if (error) return { ok: false, error: "Kunde inte markera kalenderhändelsen." };
  revalidatePath("/ringpass");
  return { ok: true, data: undefined };
}

export async function completeTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("status", "open");
  if (error) return { ok: false, error: "Kunde inte bocka av uppgiften." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** "Hämta fler": släpper in fler nya bolag i ringkön utöver dagens kvot. */
export async function releaseMoreCalls(count: number): Promise<ActionResult<{ released: number }>> {
  const n = Math.min(Math.max(Math.round(count), 1), 25);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_new_calls", { p_count: n });
  if (error) return { ok: false, error: "Kunde inte hämta fler bolag." };
  revalidatePath("/", "layout");
  return { ok: true, data: { released: typeof data === "number" ? data : 0 } };
}

