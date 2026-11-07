"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import type { Offer } from "@/lib/offer";
import { createClient } from "@/lib/supabase/server";

/** Byter erbjudande. Databasen spärrar bytet när bolaget är i sekvens eller längre fram. */
export async function changeOffer(companyId: string, offer: Offer): Promise<ActionResult> {
  if (offer !== "optely" && offer !== "sba") return { ok: false, error: "Okänt erbjudande." };
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ offer }).eq("id", companyId);
  if (error) {
    // Spärrens meddelande kommer från databasen och är redan på svenska.
    return { ok: false, error: error.message?.startsWith("Erbjudandet") || error.message?.startsWith("Partner") ? error.message : "Kunde inte byta erbjudande." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** Manuell loggning av ett LinkedIn-meddelande. Ett inkommande svar stoppar övriga kanaler. */
export async function logLinkedin(input: {
  companyId: string;
  contactId?: string | null;
  direction: "out" | "in";
  note?: string;
  sentAt?: string;
}): Promise<ActionResult> {
  if (input.direction !== "out" && input.direction !== "in") return { ok: false, error: "Välj riktning." };
  const sentAt = input.sentAt ? new Date(input.sentAt) : new Date();
  if (Number.isNaN(sentAt.getTime())) return { ok: false, error: "Ogiltig tidpunkt." };
  const supabase = await createClient();
  const { error } = await supabase.from("linkedin_messages").insert({
    company_id: input.companyId,
    contact_id: input.contactId || null,
    direction: input.direction,
    note: input.note?.trim() || null,
    sent_at: sentAt.toISOString(),
  });
  if (error) return { ok: false, error: "Kunde inte logga LinkedIn-meddelandet." };
  revalidatePath(`/contacts/${input.companyId}`);
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

const STAGES = ["kontaktad", "svar", "mote_bokat", "mote_hallet", "offert", "kund", "forlorad"] as const;
export type DealStage = (typeof STAGES)[number];

/** Flytt i pipelinen → companies.status via move_deal_stage (som synkar affären). */
export async function moveDealStage(companyId: string, stage: DealStage): Promise<ActionResult> {
  if (!STAGES.includes(stage)) return { ok: false, error: "Okänt steg." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_deal_stage", { p_company_id: companyId, p_stage: stage });
  if (error) {
    const msg = error.message ?? "";
    return { ok: false, error: msg.includes("Kontakta ej") ? msg : "Kunde inte flytta affären." };
  }
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
