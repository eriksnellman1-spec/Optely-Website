import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/chatbot/knowledge";
import {
  BookingError,
  availableSlots,
  bookMeeting,
  calendarConfigured,
  utcToHelsinki,
} from "@/lib/chatbot/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-5-5";
const MAX_MESSAGES = 30;
const MAX_CHARS = 2000;
const MAX_TOOL_ROUNDS = 6;

// Best-effort abuse limits. In-memory, so they reset when the serverless instance does.
const requestLog = new Map<string, number[]>();
const bookingLog = new Map<string, number[]>();
function overLimit(log: Map<string, number[]>, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (log.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  log.set(key, recent);
  return false;
}

const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_available_slots",
    description:
      "Get free 15-minute meeting times in Erik's calendar, in Finnish time (Europe/Helsinki). Returns days (any day of the week, 06:00-22:00) with their free start times (HH:MM). Use before offering times.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "First date to look at, YYYY-MM-DD. Use today's date unless the visitor asked for a later date.",
        },
        days: {
          type: "integer",
          description: "How many consecutive days to return, 1-10. Usually 3.",
        },
      },
      required: ["start_date", "days"],
      additionalProperties: false,
    },
  },
  {
    name: "book_meeting",
    description:
      "Book a 15-minute Google Meet intro call in Erik's calendar and email the visitor an invitation. Only call after the visitor has confirmed the date, time, name and email. Date and time must come from get_available_slots.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:MM in Finnish time, from get_available_slots" },
        name: { type: "string" },
        email: { type: "string" },
        company: { type: "string", description: "Empty string if not given" },
        phone: { type: "string", description: "Empty string if not given" },
        topic: { type: "string", description: "What the visitor wants to discuss; empty string if not given" },
      },
      required: ["date", "time", "name", "email", "company", "phone", "topic"],
      additionalProperties: false,
    },
  },
];

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

async function runTool(name: string, input: unknown, ip: string): Promise<{ text: string; isError?: boolean }> {
  if (!calendarConfigured()) {
    return {
      text: "Booking in the chat is not available right now. Offer https://calendly.com/optelyofficial/15min or erik@optely.eu instead.",
      isError: true,
    };
  }
  const args = (input ?? {}) as Record<string, unknown>;
  try {
    if (name === "get_available_slots") {
      const count = Math.min(10, Math.max(1, Math.round(Number(args.days) || 3)));
      const start = typeof args.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.start_date) ? args.start_date : undefined;
      const days = await availableSlots(start, count);
      return { text: JSON.stringify({ timeZone: "Europe/Helsinki", days }) };
    }
    if (name === "book_meeting") {
      const email = clip(args.email, 200);
      const nameArg = clip(args.name, 100);
      if (nameArg.length < 2) return { text: "A name is required.", isError: true };
      if (!EMAIL_RE.test(email)) return { text: "That email address doesn't look valid.", isError: true };
      if (overLimit(bookingLog, ip, 3, 24 * 3600_000)) {
        return { text: "Too many bookings from this visitor today. Offer erik@optely.eu instead.", isError: true };
      }
      const booked = await bookMeeting({
        date: clip(args.date, 10),
        time: clip(args.time, 5),
        name: nameArg,
        email,
        company: clip(args.company, 100) || undefined,
        phone: clip(args.phone, 40) || undefined,
        topic: clip(args.topic, 500) || undefined,
      });
      return { text: JSON.stringify({ booked: true, ...booked, invitationSentTo: email }) };
    }
    return { text: `Unknown tool ${name}`, isError: true };
  } catch (err) {
    if (err instanceof BookingError) return { text: err.message, isError: true };
    console.error("chatbot tool error", name, err);
    return {
      text: "The calendar could not be reached. Offer https://calendly.com/optelyofficial/15min or erik@optely.eu instead.",
      isError: true,
    };
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(requestLog, ip, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { locale?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const locale = ["sv", "fi", "en"].includes(body.locale as string) ? (body.locale as string) : "sv";
  const raw = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
  const history: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of raw) {
    const role = (m as { role?: unknown })?.role;
    const content = clip((m as { content?: unknown })?.content, MAX_CHARS);
    if ((role === "user" || role === "assistant") && content) history.push({ role, content });
  }
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Per-request context goes in a mid-conversation system message so the system prompt stays cacheable
  const now = utcToHelsinki(new Date());
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.weekday];
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history,
    {
      role: "system",
      content: `Now: ${weekday} ${now.date} ${now.time} Finnish time. Page language: ${locale}.`,
    },
  ];

  const client = new Anthropic();
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({ reply: null, error: "refusal" }, { status: 200 });
      }
      if (response.stop_reason !== "tool_use") {
        const reply = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({ reply });
      }

      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await runTool(block.name, block.input, ip);
        results.push({ type: "tool_result", tool_use_id: block.id, content: result.text, is_error: result.isError });
      }
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({ reply: null, error: "too_many_steps" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "busy" }, { status: 503 });
    }
    console.error("chatbot error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
