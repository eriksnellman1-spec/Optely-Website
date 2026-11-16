import "server-only";

import type { Json } from "@/lib/supabase/types";

/** Normaliserat Gmail-meddelande som skickas till log_gmail_message. */
export type GmailMessage = {
  direction: "sent" | "received";
  id: string;
  thread_id: string | null;
  from: string | null;
  to: string[];
  cc: string[];
  subject: string | null;
  snippet: string | null;
  date: string | null;
};

type Obj = { [key: string]: Json | undefined };
const isObj = (v: Json | undefined): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: Json | undefined): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

/** Hämtar ett fält oavsett skiftläge (n8n förenklat ger "From", fullständigt "from"). */
function field(o: Obj, name: string): Json | undefined {
  const key = Object.keys(o).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? o[key] : undefined;
}

/** Rå Gmail API: payload.headers = [{ name, value }]. */
function header(o: Obj, name: string): string | null {
  const payload = o.payload;
  if (!isObj(payload) || !Array.isArray(payload.headers)) return null;
  const h = payload.headers.find((x) => isObj(x) && typeof x.name === "string" && x.name.toLowerCase() === name.toLowerCase());
  return isObj(h) ? str(h.value) : null;
}

/** Adressfält i alla n8n-former: "a@b, c@d", ["a@b"], { text, value: [{ address }] }. */
function addresses(v: Json | undefined): string[] {
  if (typeof v === "string") return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap((x) => addresses(x));
  if (isObj(v)) {
    if (Array.isArray(v.value)) {
      return v.value.flatMap((x) => (isObj(x) && typeof x.address === "string" ? [x.address] : []));
    }
    const t = str(v.text) ?? str(v.address);
    return t ? addresses(t) : [];
  }
  return [];
}

/**
 * Tolkar ett Gmail-meddelande från n8n. Godtar n8n:s förenklade och fullständiga format samt rå Gmail API.
 * direction tas från payloaden eller, om den saknas, från etiketten SENT.
 */
export function parseGmailMessage(payload: Obj): GmailMessage | null {
  const m = isObj(payload.message) ? payload.message : payload;
  const id = str(m.id) ?? str(field(m, "messageId"));
  if (!id) return null;

  const labels = Array.isArray(m.labelIds) ? m.labelIds : Array.isArray(m.labels) ? m.labels : [];
  const labelSent = labels.some((l) => l === "SENT" || (isObj(l) && (l.id === "SENT" || l.name === "SENT")));
  const direction =
    payload.direction === "sent" || payload.direction === "received" ? payload.direction : labelSent ? "sent" : "received";

  const from = addresses(field(m, "from"))[0] ?? header(m, "From");
  const to = [...addresses(field(m, "to")), ...(header(m, "To") ? addresses(header(m, "To") ?? "") : [])];
  const cc = [...addresses(field(m, "cc")), ...(header(m, "Cc") ? addresses(header(m, "Cc") ?? "") : [])];

  return {
    direction,
    id,
    thread_id: str(m.threadId) ?? str(field(m, "thread_id")),
    from: from ?? null,
    to: [...new Set(to)],
    cc: [...new Set(cc)],
    subject: str(field(m, "subject")) ?? header(m, "Subject"),
    snippet: str(m.snippet) ?? str(m.text)?.slice(0, 500) ?? null,
    date: str(m.internalDate) ?? str(field(m, "date")) ?? header(m, "Date"),
  };
}
