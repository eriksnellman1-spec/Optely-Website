"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

/** "Genomfört": mötet hölls → status Behovssamtal klart (resten av §7 kommer i fas I). */
export async function markMeetingHeld(meetingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .update({ status: "held" })
    .eq("id", meetingId)
    .eq("status", "scheduled")
    .select("company_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Kunde inte spara mötet." };
  if (!meeting) return { ok: false, error: "Mötet är redan hanterat." };

  await supabase
    .from("companies")
    .update({ status: "meeting_done" })
    .eq("id", meeting.company_id)
    .eq("status", "meeting_booked");

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** "Dök inte upp": nytt samtal först i kön. */
export async function markMeetingNoShow(meetingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: meeting, error } = await supabase
    .from("meetings")
    .update({ status: "no_show" })
    .eq("id", meetingId)
    .eq("status", "scheduled")
    .select("company_id, contact_id, company:companies(name)")
    .maybeSingle();
  if (error) return { ok: false, error: "Kunde inte spara mötet." };
  if (!meeting) return { ok: false, error: "Mötet är redan hanterat." };

  let contactId = meeting.contact_id;
  if (!contactId) {
    const { data: primary } = await supabase
      .from("contacts")
      .select("id")
      .eq("company_id", meeting.company_id)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    contactId = primary?.id ?? null;
  }
  if (!contactId) return { ok: false, error: "Mötet sparades, men bolaget saknar kontaktperson att ringa." };

  const { error: callError } = await supabase.rpc("schedule_call", {
    p_company_id: meeting.company_id,
    p_contact_id: contactId,
    p_due: new Date().toISOString(),
    p_title: `Dök inte upp: ${meeting.company?.name ?? "bolaget"}`,
    p_priority: 1,
    p_description: "Behovssamtalet blev inte av – boka ny tid.",
  });
  if (callError) return { ok: false, error: "Mötet sparades, men samtalet kunde inte läggas i kön." };

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
