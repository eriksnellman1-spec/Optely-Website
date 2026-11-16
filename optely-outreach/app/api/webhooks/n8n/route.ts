import { NextResponse, type NextRequest } from "next/server";

import { parseGmailMessage } from "@/lib/gmail-message";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";
import { verifyWebhookSecret } from "@/lib/webhooks";

/**
 * POST /api/webhooks/n8n
 * 1. Verifiera x-optely-secret  2. Logga rå payload i webhook_events
 * 3. Bearbeta                   4. Sätt processed_at / error
 *
 * Bearbetade typer:
 *   gmail.message – ett mejl från Eriks Gmail (n8n). Skickat till eller mottaget från en partner
 *                   loggas i partner_emails (+ check-in). Övriga mejl ignoreras.
 * Övriga typer loggas bara.
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

  if (eventType === "gmail.message" && payload && typeof payload === "object" && !Array.isArray(payload)) {
    const message = parseGmailMessage(payload);
    if (!message) {
      await supabase.from("webhook_events").update({ error: "Meddelandet saknar id" }).eq("id", data.id);
      return NextResponse.json({ ok: false, error: "missing_message_id" }, { status: 422 });
    }
    const { data: result, error: logError } = await supabase.rpc("log_gmail_message", { p: message });
    await supabase
      .from("webhook_events")
      .update(logError ? { error: logError.message } : { processed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (logError) return NextResponse.json({ ok: false, error: "process_failed" }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, result });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
