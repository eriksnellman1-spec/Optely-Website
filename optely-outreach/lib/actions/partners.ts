"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

export async function logPartnerCheckin(input: {
  partnerId: string;
  notes?: string;
}): Promise<ActionResult> {
  if (!input.partnerId) return { ok: false, error: "Välj en partner." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_checkins")
    .insert({ partner_id: input.partnerId, notes: input.notes?.trim() || null });
  if (error) return { ok: false, error: "Kunde inte logga check-in." };

  // Stäng eventuella öppna check-in-uppgifter för partnern.
  await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("partner_id", input.partnerId)
    .eq("type", "partner_checkin")
    .eq("status", "open");

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const ERR: Record<string, string> = {
  "Hantera svaret först": "Hantera svaret först.",
  "Välj ett datum framåt": "Välj ett datum framåt.",
  "Inget steg att hoppa över": "Det finns inget steg att hoppa över.",
};
const friendly = (msg: string | undefined, fallback: string) =>
  Object.entries(ERR).find(([k]) => msg?.includes(k))?.[1] ?? fallback;

/** Hoppa över partnerns nästa steg – nästa steg räknas från i dag. */
export async function skipPartnerStep(partnerId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("partner_skip_step", { p_partner: partnerId });
  if (error) return { ok: false, error: friendly(error.message, "Kunde inte hoppa över steget.") };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export type PartnerAction = "meeting" | "call" | "not_now" | "no";

/** Hantera ett svar: Boka möte, Ring upp, Inte nu (till datum) eller Nej. */
export async function handlePartner(partnerId: string, action: PartnerAction, until?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("partner_handle", { p_partner: partnerId, p_action: action, p_until: until || undefined });
  if (error) return { ok: false, error: friendly(error.message, "Kunde inte spara valet.") };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** Logga ett samtal med partnern. Resultat: fortsätt sekvensen, möte bokat, inte nu eller nej. */
export async function logPartnerCall(input: {
  partnerId: string;
  notes?: string;
  result: "continue" | "meeting" | "not_now" | "no";
  until?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_partner_call", {
    p_partner: input.partnerId,
    p_notes: input.notes?.trim() || undefined,
    p_result: input.result,
    p_until: input.until || undefined,
  });
  if (error) return { ok: false, error: friendly(error.message, "Kunde inte logga samtalet.") };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** Markera partnerns mejlsteg som gjort ("Mejl skickat") utan att vänta på Gmail-synken. */
export async function logPartnerMail(partnerId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_partner_mail", { p_partner: partnerId });
  if (error) return { ok: false, error: "Kunde inte markera mejlet." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
