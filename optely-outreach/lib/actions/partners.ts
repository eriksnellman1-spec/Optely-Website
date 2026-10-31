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
