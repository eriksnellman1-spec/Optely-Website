"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/types";
import { CHANNEL_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type WeekPlanInput = Record<(typeof DAYS)[number], string>;

/** Veckoplanen: kanal per veckodag (styr ringdagar och mejldagar). */
export async function saveWeekPlan(plan: WeekPlanInput): Promise<ActionResult> {
  const value: Record<string, Json> = {};
  for (const d of DAYS) {
    const channel = plan[d];
    if (!(channel in CHANNEL_LABEL)) return { ok: false, error: "Okänd kanal." };
    value[d] = { channel, label: CHANNEL_LABEL[channel] };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({ value }).eq("key", "week_plan");
  if (error) return { ok: false, error: "Kunde inte spara veckoplanen." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** Nya bolag per ringdag (settings.ringpass.new_per_day). Övriga ringpassvärden behålls. */
export async function saveNewPerDay(newPerDay: number): Promise<ActionResult> {
  const n = Math.round(Number(newPerDay));
  if (!Number.isFinite(n) || n < 0 || n > 200) return { ok: false, error: "Ange ett tal mellan 0 och 200." };
  const supabase = await createClient();
  const { data, error: readError } = await supabase.from("settings").select("value").eq("key", "ringpass").maybeSingle();
  if (readError) return { ok: false, error: "Kunde inte läsa inställningen." };
  const current = data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value : {};
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "ringpass", value: { ...current, new_per_day: n } }, { onConflict: "key" });
  if (error) return { ok: false, error: "Kunde inte spara." };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
