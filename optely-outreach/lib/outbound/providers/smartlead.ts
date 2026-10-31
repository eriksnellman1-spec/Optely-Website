import "server-only";

import { NotImplementedError } from "../errors";
import type { Db, OutboundProvider } from "../provider";

/** Smartlead – implementeras i steg 3. Den enda filen som får känna till Smartlead. */
export function smartleadProvider(_db: Db): OutboundProvider {
  void _db;
  return {
    id: "smartlead",
    async sendBatch() {
      throw new NotImplementedError("smartlead", "sendBatch");
    },
    async pauseCampaign() {
      throw new NotImplementedError("smartlead", "pauseCampaign");
    },
    async getStatus() {
      throw new NotImplementedError("smartlead", "getStatus");
    },
  };
}
