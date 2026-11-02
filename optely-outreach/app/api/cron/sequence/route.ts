import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { dispatchEmails } from "@/lib/outbound/dispatch";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/cron/sequence – körs dagligen av Vercel Cron (se vercel.json).
 * Vercel skickar "Authorization: Bearer <CRON_SECRET>".
 *
 * 1. run_daily_sequence(): återaktiverar vilande bolag, skapar dagens ringuppgifter
 *    och mejlsteg (idempotent – säkert att köra flera gånger).
 * 2. Godkända sekvensmejl lämnas till utskicksadaptern.
 * 3. Körningen loggas i webhook_events (source 'cron').
 */
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: log } = await db
    .from("webhook_events")
    .insert({ source: "cron", event_type: "sequence.daily", payload: { started_at: new Date().toISOString() } })
    .select("id")
    .single();

  try {
    const { data, error } = await db.rpc("run_daily_sequence");
    if (error) throw new Error(error.message);

    const result = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const emailIds = Array.isArray(result.email_ids)
      ? result.email_ids.filter((x): x is string => typeof x === "string")
      : [];
    const dispatch = await dispatchEmails(db, emailIds);

    const summary = {
      reactivated: Number(result.reactivated ?? 0),
      tasks_created: Number(result.tasks_created ?? 0),
      emails_queued: dispatch.queued,
      emails_failed: dispatch.failed,
      provider: dispatch.provider,
    };

    if (log) {
      await db
        .from("webhook_events")
        .update({ payload: summary, processed_at: new Date().toISOString() })
        .eq("id", log.id);
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "okänt fel";
    if (log) await db.from("webhook_events").update({ error: message }).eq("id", log.id);
    console.error("[cron/sequence]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
