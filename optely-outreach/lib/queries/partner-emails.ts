import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type PartnerEmailLog = {
  week: { sent: number; replies: number; partnersSent: number; partnersReplied: number };
  lastWeek: { sent: number; replies: number; partnersSent: number; partnersReplied: number };
  latest: {
    id: string;
    direction: "sent" | "received";
    partnerName: string;
    subject: string | null;
    snippet: string | null;
    occurredAt: string;
  }[];
};

const helsinkiDate = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(new Date(iso));

/** Partnermejl från Gmail: veckans och förra veckans siffror samt de senaste mejlen. */
export async function loadPartnerEmails(supabase: Client, thisWeek: string, lastWeek: string): Promise<PartnerEmailLog> {
  const from = new Date(new Date(`${lastWeek}T00:00:00Z`).getTime() - 86_400_000).toISOString();
  const [weekRes, latestRes] = await Promise.all([
    supabase.from("partner_emails").select("partner_id, direction, occurred_at").gte("occurred_at", from).limit(5000),
    supabase
      .from("partner_emails")
      .select("id, direction, subject, snippet, occurred_at, partner:partners(name)")
      .order("occurred_at", { ascending: false })
      .limit(15),
  ]);

  const bucket = (start: string, end: string | null) => {
    const rows = (weekRes.data ?? []).filter((r) => {
      const d = helsinkiDate(r.occurred_at);
      return d >= start && (end === null || d < end);
    });
    const sent = rows.filter((r) => r.direction === "sent");
    const replies = rows.filter((r) => r.direction === "received");
    return {
      sent: sent.length,
      replies: replies.length,
      partnersSent: new Set(sent.map((r) => r.partner_id)).size,
      partnersReplied: new Set(replies.map((r) => r.partner_id)).size,
    };
  };

  return {
    week: bucket(thisWeek, null),
    lastWeek: bucket(lastWeek, thisWeek),
    latest: (latestRes.data ?? []).map((r) => ({
      id: r.id,
      direction: r.direction === "sent" ? "sent" : "received",
      partnerName: r.partner?.name ?? "Partner",
      subject: r.subject,
      snippet: r.snippet,
      occurredAt: r.occurred_at,
    })),
  };
}
