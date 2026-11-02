import "server-only";

import { getProvider, type Db } from "./provider";

export type DispatchResult = { queued: number; failed: number; provider: string };

/**
 * Lämnar godkända mejl till vald utskicksleverantör.
 * Mejl som inte kan skickas (t.ex. mottagaren saknar e-post) markeras 'failed'
 * så att de inte försöks igen i varje cron-körning.
 */
export async function dispatchEmails(db: Db, ids: string[]): Promise<DispatchResult> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return { queued: 0, failed: 0, provider: "-" };

  const { data, error } = await db
    .from("emails")
    .select("id, campaign_id, company_id, contact_id, subject, body, contact:contacts(email)")
    .in("id", unique)
    .eq("status", "approved");
  if (error) throw new Error(`Kunde inte läsa mejlen: ${error.message}`);
  if (data.length === 0) return { queued: 0, failed: 0, provider: "-" };

  const provider = await getProvider(db);
  const result = await provider.sendBatch(
    data.map((e) => ({
      id: e.id,
      campaignId: e.campaign_id,
      companyId: e.company_id,
      contactId: e.contact_id,
      to: e.contact?.email ?? "",
      subject: e.subject,
      body: e.body,
    })),
  );

  for (const s of result.skipped) {
    await db.from("emails").update({ status: "failed", error: s.reason }).eq("id", s.id).eq("status", "approved");
  }

  return { queued: result.queued.length, failed: result.skipped.length, provider: provider.id };
}
