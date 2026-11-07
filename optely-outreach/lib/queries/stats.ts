import "server-only";

import { addDaysIso, weekStartHelsinki } from "@/lib/format";
import type { Offer, OfferFilter } from "@/lib/offer";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type StatRow = {
  week: string;
  offer: Offer;
  channel: string;
  contacted: number;
  replies: number;
  booked: number;
  won: number;
};

export const CHANNEL_ORDER = ["alla", "samtal", "e-post", "linkedin", "sms", "partner", "okänd"];
export const CHANNEL_NAME: Record<string, string> = {
  alla: "Alla kanaler",
  samtal: "Samtal",
  "e-post": "E-post",
  linkedin: "LinkedIn",
  sms: "SMS",
  partner: "Partner",
  okänd: "Okänd kanal",
};

/** De senaste `weeks` veckornas rader ur offer_stats_weekly (nyast först i `weeks`). */
export async function loadWeeklyStats(supabase: Client, offer: OfferFilter, weeks = 4) {
  const current = weekStartHelsinki();
  const weekList = Array.from({ length: weeks }, (_, i) => addDaysIso(current, -7 * i));
  let q = supabase.from("offer_stats_weekly").select("*").gte("week_start", weekList[weekList.length - 1]);
  if (offer !== "all") q = q.eq("offer", offer);
  const { data, error } = await q;
  if (error) throw new Error("Kunde inte läsa veckostatistiken.");

  const rows: StatRow[] = (data ?? [])
    .filter((r) => r.week_start && r.offer && r.channel)
    .map((r) => ({
      week: r.week_start as string,
      offer: r.offer as Offer,
      channel: r.channel as string,
      contacted: r.contacted ?? 0,
      replies: r.replies ?? 0,
      booked: r.meetings_booked ?? 0,
      won: r.deals_won ?? 0,
    }));

  const get = (week: string, o: Offer, channel: string) =>
    rows.find((r) => r.week === week && r.offer === o && r.channel === channel) ?? {
      week,
      offer: o,
      channel,
      contacted: 0,
      replies: 0,
      booked: 0,
      won: 0,
    };

  const channelsFor = (o: Offer) =>
    CHANNEL_ORDER.filter((c) => c === "alla" || rows.some((r) => r.offer === o && r.channel === c && (r.contacted || r.booked || r.replies || r.won)));

  return { weeks: weekList, rows, get, channelsFor };
}

export function per100(booked: number, contacted: number): string {
  if (!contacted) return "–";
  return (Math.round((booked * 1000) / contacted) / 10).toLocaleString("sv-FI");
}
