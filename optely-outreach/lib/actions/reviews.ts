"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import type { Offer } from "@/lib/offer";
import { createClient } from "@/lib/supabase/server";

/** "Vad ska ändras" för en vecka (och ett erbjudande, null = alla). */
export async function saveWeeklyReview(input: { weekStart: string; offer: Offer | null; notes: string }): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)) return { ok: false, error: "Ogiltig vecka." };
  const supabase = await createClient();
  let find = supabase.from("weekly_reviews").select("id").eq("week_start", input.weekStart);
  find = input.offer ? find.eq("offer", input.offer) : find.is("offer", null);
  const { data: existing } = await find.maybeSingle();

  const { error } = existing
    ? await supabase.from("weekly_reviews").update({ notes: input.notes }).eq("id", existing.id)
    : await supabase.from("weekly_reviews").insert({ week_start: input.weekStart, offer: input.offer, notes: input.notes });
  if (error) return { ok: false, error: "Kunde inte spara anteckningen." };
  revalidatePath("/strategy");
  return { ok: true, data: undefined };
}
