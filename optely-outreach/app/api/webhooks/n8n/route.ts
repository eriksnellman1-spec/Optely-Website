import { NextResponse, type NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";
import { verifyWebhookSecret } from "@/lib/webhooks";

/**
 * POST /api/webhooks/n8n
 * 1. Verifiera x-optely-secret  2. Logga rå payload i webhook_events
 * 3. Bearbeta (steg 3)          4. Sätt processed_at / error
 *
 * Steg 1: bara verifiering och loggning – ingen bearbetning ännu.
 */
export async function POST(request: NextRequest) {
  if (!verifyWebhookSecret(request.headers.get("x-optely-secret"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: Json;
  try {
    payload = (await request.json()) as Json;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventType =
    payload && typeof payload === "object" && !Array.isArray(payload) && typeof payload.type === "string"
      ? payload.type
      : request.headers.get("x-optely-event");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("webhook_events")
    .insert({ source: "n8n", event_type: eventType, payload })
    .select("id")
    .single();

  if (error) {
    console.error("[webhooks/n8n] kunde inte logga händelsen", error.message);
    return NextResponse.json({ ok: false, error: "log_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
