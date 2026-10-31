import "server-only";

import type { CampaignDeliveryStatus, Db, OutboundProvider } from "../provider";

/**
 * Manuell leverantör: markerar godkända mejl som `queued` och gör inget mer.
 * Erik (eller ett n8n-flöde) skickar dem sedan för hand.
 */
export function manualProvider(db: Db): OutboundProvider {
  return {
    id: "manual",

    async sendBatch(emails) {
      if (emails.length === 0) return { queued: [], skipped: [] };
      const ids = emails.map((e) => e.id);

      const { data, error } = await db
        .from("emails")
        .update({ status: "queued", queued_at: new Date().toISOString() })
        .in("id", ids)
        .eq("status", "approved")
        .select("id");
      if (error) throw new Error(`Kunde inte köa mejlen: ${error.message}`);

      const queued = data.map((r) => r.id);
      const queuedSet = new Set(queued);
      return {
        queued,
        skipped: ids
          .filter((id) => !queuedSet.has(id))
          .map((id) => ({ id, reason: "Mejlet är inte godkänt (status måste vara approved)" })),
      };
    },

    async pauseCampaign(campaignId) {
      const { error } = await db.from("campaigns").update({ status: "paused" }).eq("id", campaignId);
      if (error) throw new Error(`Kunde inte pausa kampanjen: ${error.message}`);
    },

    async getStatus(campaignId) {
      const [campaign, emails] = await Promise.all([
        db.from("campaigns").select("status").eq("id", campaignId).maybeSingle(),
        db.from("emails").select("status").eq("campaign_id", campaignId),
      ]);
      if (campaign.error || emails.error) throw new Error("Kunde inte läsa kampanjstatus.");

      const count = (s: string) => emails.data.filter((e) => e.status === s).length;
      const state: CampaignDeliveryStatus["state"] =
        campaign.data?.status === "active" || campaign.data?.status === "paused" || campaign.data?.status === "completed"
          ? campaign.data.status
          : "unknown";

      return {
        campaignId,
        state,
        queued: count("queued"),
        sent: count("sent"),
        bounced: count("bounced"),
        replied: count("replied"),
      };
    },
  };
}
