import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Jämför x-optely-secret mot WEBHOOK_SECRET i konstant tid. */
export function verifyWebhookSecret(header: string | null): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
