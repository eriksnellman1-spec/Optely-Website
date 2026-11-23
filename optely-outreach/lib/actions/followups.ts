"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

export type FollowupOutcome = "no_answer" | "talked" | "meeting" | "not_now" | "no";
export type NextChannel = "samtal" | "mejl" | "möte";

const ERR = ["Skriv nästa steg", "Välj ett datum framåt"];

/** Utfall för ett uppföljningssamtal (partnersekvens eller Pipeline). Går sedan tillbaka till sin kanal. */
export async function followupCallOutcome(input: {
  kind: "partner" | "deal";
  refId: string;
  outcome: FollowupOutcome;
  notes?: string;
  until?: string;
  next?: string;
  nextChannel?: NextChannel;
  nextAt?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("followup_call_outcome", {
    p_kind: input.kind,
    p_ref: input.refId,
    p_outcome: input.outcome,
    p_notes: input.notes?.trim() || undefined,
    p_until: input.until || undefined,
    p_next: input.next?.trim() || undefined,
    p_next_channel: input.nextChannel,
    p_next_at: input.nextAt || undefined,
  });
  if (error) {
    const known = ERR.find((e) => error.message?.includes(e));
    return { ok: false, error: known ? `${known}.` : "Kunde inte spara utfallet." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** Sätt affärens nästa steg med kanal (Samtal hamnar i Ringpasset när dagen kommer). */
export async function updateDealNextStep(input: {
  dealId: string;
  next: string;
  channel: NextChannel | null;
  at: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const next = input.next.trim();
  // Datumet sparas kl. 09:00 Helsingfors-tid (servern kan gå i UTC).
  let atIso: string | null = null;
  if (input.at) {
    const { data } = await supabase.rpc("helsinki_at", { p_day: input.at, p_time: "09:00" });
    atIso = typeof data === "string" ? data : null;
  }
  const { error } = await supabase
    .from("deals")
    .update({ next_action: next || null, next_action_channel: next ? input.channel : null, next_action_at: next ? atIso : null })
    .eq("id", input.dealId);
  if (error) return { ok: false, error: "Kunde inte spara nästa steg." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
