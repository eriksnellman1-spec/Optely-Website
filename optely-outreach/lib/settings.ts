import "server-only";

import { weekdayKey } from "@/lib/format";
import { CHANNEL_LABEL } from "@/lib/labels";
import type { Json } from "@/lib/supabase/types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type DayPlan = { channel: string; label: string };

function isRecord(v: Json | undefined): v is { [key: string]: Json | undefined } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function getSetting(supabase: Client, key: string): Promise<Json | null> {
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

/** Dagens kanal enligt settings.week_plan, t.ex. { channel: "phone", label: "Ringpass" }. */
export function todaysPlan(weekPlan: Json | null, date = new Date()): DayPlan | null {
  if (!isRecord(weekPlan)) return null;
  const day = weekPlan[weekdayKey(date)];
  if (!isRecord(day) || typeof day.channel !== "string") return null;
  const label = typeof day.label === "string" ? day.label : (CHANNEL_LABEL[day.channel] ?? day.channel);
  return { channel: day.channel, label };
}
