import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";
import { manualProvider } from "./providers/manual";
import { n8nSmtpProvider } from "./providers/n8n-smtp";
import { smartleadProvider } from "./providers/smartlead";

/**
 * Utskick är en adapter. ALL kod som skickar mejl går via getProvider().
 * Ingen annan del av appen får känna till Smartlead eller andra leverantörer.
 */

export type Db = SupabaseClient<Database>;

export const PROVIDER_IDS = ["manual", "smartlead", "n8n-smtp"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type OutboundEmail = {
  id: string;
  campaignId: string | null;
  companyId: string;
  contactId: string | null;
  to: string;
  subject: string;
  body: string;
};

export type SendBatchResult = {
  /** Mejl som lämnats över till leverantören (status queued). */
  queued: string[];
  /** Mejl som inte skickades, med orsak (t.ex. avregistrerad). */
  skipped: { id: string; reason: string }[];
};

export type CampaignDeliveryStatus = {
  campaignId: string;
  state: "active" | "paused" | "completed" | "unknown";
  queued: number;
  sent: number;
  bounced: number;
  replied: number;
};

export interface OutboundProvider {
  readonly id: ProviderId;
  sendBatch(emails: OutboundEmail[]): Promise<SendBatchResult>;
  pauseCampaign(campaignId: string): Promise<void>;
  getStatus(campaignId: string): Promise<CampaignDeliveryStatus>;
}

export { NotImplementedError } from "./errors";

const factories: Record<ProviderId, (db: Db) => OutboundProvider> = {
  manual: manualProvider,
  smartlead: smartleadProvider,
  "n8n-smtp": n8nSmtpProvider,
};

function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && (PROVIDER_IDS as readonly string[]).includes(v);
}

function readProviderId(value: Json | null | undefined): ProviderId {
  if (value && typeof value === "object" && !Array.isArray(value) && isProviderId(value.provider)) {
    return value.provider;
  }
  return "manual";
}

/**
 * Hämtar vald leverantör från settings.outbound.provider (standard: manual).
 * Returnerad provider filtrerar alltid bort avregistrerade mottagare före utskick.
 */
export async function getProvider(db: Db): Promise<OutboundProvider> {
  const { data, error } = await db.from("settings").select("value").eq("key", "outbound").maybeSingle();
  if (error) throw new Error("Kunde inte läsa settings.outbound.");
  const provider = factories[readProviderId(data?.value)](db);
  return withDoNotContactGuard(db, provider);
}

/** Avregistrering respekteras alltid – oavsett leverantör. */
function withDoNotContactGuard(db: Db, provider: OutboundProvider): OutboundProvider {
  return {
    id: provider.id,
    pauseCampaign: (id) => provider.pauseCampaign(id),
    getStatus: (id) => provider.getStatus(id),
    async sendBatch(emails) {
      if (emails.length === 0) return { queued: [], skipped: [] };

      const companyIds = [...new Set(emails.map((e) => e.companyId))];
      const contactIds = [...new Set(emails.flatMap((e) => (e.contactId ? [e.contactId] : [])))];

      const [companies, contacts] = await Promise.all([
        db.from("companies").select("id").in("id", companyIds).eq("do_not_contact", true),
        contactIds.length
          ? db.from("contacts").select("id").in("id", contactIds).eq("do_not_contact", true)
          : Promise.resolve({ data: [] as { id: string }[], error: null }),
      ]);
      if (companies.error || contacts.error) {
        throw new Error("Kunde inte kontrollera avregistreringar – inget skickades.");
      }

      const blockedCompanies = new Set(companies.data.map((c) => c.id));
      const blockedContacts = new Set(contacts.data.map((c) => c.id));

      const skipped: SendBatchResult["skipped"] = [];
      const allowed = emails.filter((e) => {
        if (blockedCompanies.has(e.companyId) || (e.contactId && blockedContacts.has(e.contactId))) {
          skipped.push({ id: e.id, reason: "Avregistrerad (do_not_contact)" });
          return false;
        }
        if (!e.to) {
          skipped.push({ id: e.id, reason: "Mottagaren saknar e-postadress" });
          return false;
        }
        return true;
      });

      const result = allowed.length ? await provider.sendBatch(allowed) : { queued: [], skipped: [] };
      return { queued: result.queued, skipped: [...skipped, ...result.skipped] };
    },
  };
}
