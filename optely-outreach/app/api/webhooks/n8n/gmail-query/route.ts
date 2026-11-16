import { NextResponse, type NextRequest } from "next/server";

import { gmailQueries, partnerTerms } from "@/lib/gmail-query";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSecret } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks/n8n/gmail-query
 * Ger n8n färdiga Gmail-sökningar som bara träffar mejl till/från partnerna i appen.
 *   ?minutes=11        mejl de senaste 11 minuterna (schemat körs var 10:e minut)
 *   ?since=2026-11-01  mejl sedan ett datum (hämta bakåt en gång)
 * Skyddas med x-optely-secret precis som POST-webhooken.
 */
export async function GET(request: NextRequest) {
  if (!verifyWebhookSecret(request.headers.get("x-optely-secret"))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const since = params.get("since");
  const minutes = Number(params.get("minutes") ?? "11");
  let after: Date;
  if (since) {
    after = new Date(`${since}T00:00:00+02:00`);
    if (Number.isNaN(after.getTime())) return NextResponse.json({ ok: false, error: "invalid_since" }, { status: 400 });
  } else {
    after = new Date(Date.now() - (Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 60 * 24 * 31) : 11) * 60_000);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("partners").select("email");
  if (error) return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });

  const queries = gmailQueries(partnerTerms(data.map((p) => p.email)), after);
  return NextResponse.json({ ok: true, ...queries, after: after.toISOString() });
}
