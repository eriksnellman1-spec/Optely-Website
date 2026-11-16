import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type PartnerEmailLog = {
  week: { sent: number; partners: number };
  lastWeek: { sent: number; partners: number };
  mailedTotal: number;
  partnersTotal: number;
  latest: { id: string; partnerName: string; subject: string | null; snippet: string | null; occurredAt: string }[];
};

const helsinkiDate = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(new Date(iso));

/** Skickade partnermejl (från Gmail): veckans och förra veckans siffror, hur många partner som mejlats, senaste mejlen. */
export async function loadPartnerEmails(supabase: Client, thisWeek: string, lastWeek: string): Promise<PartnerEmailLog> {
  const [sentRes, latestRes, partnersRes] = await Promise.all([
    supabase.from("partner_emails").select("partner_id, occurred_at").eq("direction", "sent").limit(10000),
    supabase
      .from("partner_emails")
      .select("id, subject, snippet, occurred_at, partner:partners(name)")
      .eq("direction", "sent")
      .order("occurred_at", { ascending: false })
      .limit(15),
    supabase.from("partners").select("id", { count: "exact", head: true }),
  ]);
  const sent = sentRes.data ?? [];

  const bucket = (start: string, end: string | null) => {
    const rows = sent.filter((r) => {
      const d = helsinkiDate(r.occurred_at);
      return d >= start && (end === null || d < end);
    });
    return { sent: rows.length, partners: new Set(rows.map((r) => r.partner_id)).size };
  };

  return {
    week: bucket(thisWeek, null),
    lastWeek: bucket(lastWeek, thisWeek),
    mailedTotal: new Set(sent.map((r) => r.partner_id)).size,
    partnersTotal: partnersRes.count ?? 0,
    latest: (latestRes.data ?? []).map((r) => ({
      id: r.id,
      partnerName: r.partner?.name ?? "Partner",
      subject: r.subject,
      snippet: r.snippet,
      occurredAt: r.occurred_at,
    })),
  };
}
