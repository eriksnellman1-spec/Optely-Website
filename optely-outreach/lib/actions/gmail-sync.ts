"use server";

import type { ActionResult } from "@/lib/actions/types";
import { createClient } from "@/lib/supabase/server";

const helsinkiDate = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" }).format(d);

/**
 * Startar n8n-flödet som hämtar skickade partnermejl från Gmail.
 * Hämtar från dagen före det senast loggade mejlet (eller 30 dagar bakåt första gången).
 */
export async function syncPartnerGmail(): Promise<ActionResult<{ since: string }>> {
  const url = process.env.N8N_GMAIL_SYNC_URL;
  const secret = process.env.WEBHOOK_SECRET;
  if (!url || !secret) {
    return { ok: false, error: "Synken är inte inställd: N8N_GMAIL_SYNC_URL eller WEBHOOK_SECRET saknas i Vercel." };
  }

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("partner_emails")
    .select("occurred_at")
    .eq("direction", "sent")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const from = latest ? new Date(new Date(latest.occurred_at).getTime() - 86_400_000) : new Date(Date.now() - 30 * 86_400_000);
  const since = helsinkiDate(from);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-optely-secret": secret },
      body: JSON.stringify({ since }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) return { ok: false, error: "n8n nekade anropet – kontrollera nyckeln i n8n." };
    if (res.status === 404) return { ok: false, error: "n8n hittade inte flödet – är det aktiverat och stämmer adressen?" };
    if (!res.ok) return { ok: false, error: `n8n svarade med fel (${res.status}).` };
  } catch {
    return { ok: false, error: "Kunde inte nå n8n. Kontrollera adressen i N8N_GMAIL_SYNC_URL." };
  }
  return { ok: true, data: { since } };
}
