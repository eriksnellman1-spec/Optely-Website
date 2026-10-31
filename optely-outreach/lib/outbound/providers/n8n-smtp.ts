import "server-only";

import { NotImplementedError } from "../errors";
import type { Db, OutboundProvider } from "../provider";

/** Utskick via n8n + SMTP från outreach-domänen – implementeras i steg 3. */
export function n8nSmtpProvider(_db: Db): OutboundProvider {
  void _db;
  return {
    id: "n8n-smtp",
    async sendBatch() {
      throw new NotImplementedError("n8n-smtp", "sendBatch");
    },
    async pauseCampaign() {
      throw new NotImplementedError("n8n-smtp", "pauseCampaign");
    },
    async getStatus() {
      throw new NotImplementedError("n8n-smtp", "getStatus");
    },
  };
}
