import type { Metadata } from "next";

import { RingpassView, type QueueItem, type TimelineEvent } from "@/components/ringpass/ringpass-view";
import type { TodoData } from "@/components/ringpass/todo-panel";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ringpass" };

const CALL_OUTCOME: Record<string, string> = {
  no_answer: "Ej svar",
  voicemail: "Röstmeddelande",
  callback: "Ring senare",
  interested: "Intresserad",
  not_interested: "Inte intresserad",
  meeting_booked: "Bokat",
  wrong_person: "Fel person",
  send_info: "Skicka info",
  not_now: "Nej, inte nu",
  no_need: "Nej, inget behov",
  do_not_call: "Ring ej",
};

/** Början av morgondagen i Helsingfors som ISO-sträng (gräns för "i dag"). */
function startOfTomorrowHelsinki() {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Helsinki",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  // Offset mellan UTC och Helsingfors just nu (2 eller 3 h).
  const offsetH = (Number(parts.hour) - now.getUTCHours() + 24) % 24;
  const tomorrow = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, -offsetH));
  return tomorrow.toISOString();
}

export default async function RingpassPage() {
  const supabase = await createClient();
  const tomorrow = startOfTomorrowHelsinki();

  const queueRes = await supabase.from("ringpass_queue").select("*").order("priority").order("due_at").limit(200);
  if (queueRes.error) throw new Error("Kunde inte läsa Ringpassets kö.");

  const queue = queueRes.data.filter((q): q is typeof q & { task_id: string; company_id: string } =>
    Boolean(q.task_id && q.company_id),
  );
  const companyIds = [...new Set(queue.map((q) => q.company_id))];
  const none = Promise.resolve({ data: [], error: null });

  const [upcomingRes, scriptsRes, infoRes, smsRes, meetingsRes, linkedinRes, callsRes, emailsRes, repliesRes] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .in("type", ["call", "follow_up"])
        .gte("due_at", tomorrow),
      supabase
        .from("context_entries")
        .select("id, kind, title, content")
        .in("kind", ["script", "objection"])
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("context_entries").select("content").eq("slug", "mejl-skicka-info").maybeSingle(),
      supabase
        .from("sms_messages")
        .select("id, to_phone, body, due_at, template, company:companies(name), contact:contacts(first_name, last_name)")
        .eq("status", "pending")
        .lt("due_at", tomorrow)
        .order("due_at"),
      supabase
        .from("meetings")
        .select("id, title, starts_at, ends_at, location, company:companies(name), contact:contacts(first_name, last_name, email, phone)")
        .eq("status", "scheduled")
        .is("calendar_added_at", null)
        .order("starts_at"),
      supabase
        .from("tasks")
        .select("id, title, description, company:companies(name), contact:contacts(first_name, last_name)")
        .eq("status", "open")
        .eq("type", "linkedin")
        .lt("due_at", tomorrow)
        .order("due_at"),
      companyIds.length
        ? supabase
            .from("calls")
            .select("company_id, outcome, notes, called_at")
            .in("company_id", companyIds)
            .order("called_at", { ascending: false })
            .limit(300)
        : none,
      companyIds.length
        ? supabase
            .from("emails")
            .select("company_id, subject, status, sent_at, queued_at, created_at")
            .in("company_id", companyIds)
            .in("status", ["queued", "sent", "replied", "bounced"])
            .order("created_at", { ascending: false })
            .limit(300)
        : none,
      companyIds.length
        ? supabase
            .from("replies")
            .select("company_id, body, received_at")
            .in("company_id", companyIds)
            .order("received_at", { ascending: false })
            .limit(300)
        : none,
    ]);

  const timeline: Record<string, TimelineEvent[]> = {};
  const push = (companyId: string, e: TimelineEvent) => (timeline[companyId] ??= []).push(e);
  for (const c of callsRes.data ?? []) {
    push(c.company_id, { at: c.called_at, kind: "call", text: CALL_OUTCOME[c.outcome] ?? c.outcome, detail: c.notes });
  }
  for (const e of emailsRes.data ?? []) {
    push(e.company_id, {
      at: e.sent_at ?? e.queued_at ?? e.created_at,
      kind: "email",
      text: e.subject,
      detail: e.status === "bounced" ? "Studsade" : e.status === "queued" ? "Köat för utskick" : null,
    });
  }
  for (const r of repliesRes.data ?? []) {
    push(r.company_id, { at: r.received_at, kind: "reply", text: "Svar", detail: r.body.slice(0, 200) });
  }
  for (const id of Object.keys(timeline)) {
    timeline[id] = timeline[id].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }

  const name = (k: { first_name: string; last_name: string | null } | null) =>
    k ? [k.first_name, k.last_name].filter(Boolean).join(" ") : null;

  const todo: TodoData = {
    sms: (smsRes.data ?? []).map((s) => ({
      id: s.id,
      toPhone: s.to_phone,
      body: s.body,
      dueAt: s.due_at,
      kind: s.template === "sms-bokat" ? "Bekräftelse" : "Efter obesvarat samtal",
      companyName: s.company?.name ?? "",
      contactName: name(s.contact),
    })),
    meetings: (meetingsRes.data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      startsAt: m.starts_at,
      endsAt: m.ends_at,
      location: m.location,
      companyName: m.company?.name ?? "",
      contactName: name(m.contact),
      contactEmail: m.contact?.email ?? null,
      contactPhone: m.contact?.phone ?? null,
    })),
    linkedin: (linkedinRes.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      companyName: t.company?.name ?? "",
      contactName: name(t.contact),
    })),
  };

  const items: QueueItem[] = queue.map((q) => ({
    taskId: q.task_id,
    taskType: q.task_type === "follow_up" ? "follow_up" : "call",
    title: q.title ?? "",
    description: q.description,
    priority: q.priority ?? 2,
    dueAt: q.due_at ?? new Date().toISOString(),
    isReply: Boolean(q.reply_id) || (q.title ?? "").startsWith("Svar:"),
    attempt: q.attempt,
    companyId: q.company_id,
    companyName: q.company_name ?? "",
    city: q.city,
    industry: q.industry,
    employees: q.employees,
    website: q.website,
    companyStatus: q.company_status,
    companyNotes: q.company_notes,
    partnerName: q.partner_name,
    previousCalls: q.previous_calls ?? 0,
    contactId: q.contact_id,
    contactName: [q.first_name, q.last_name].filter(Boolean).join(" ") || null,
    firstName: q.first_name,
    role: q.role,
    phone: q.phone,
    email: q.email,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ringpass"
        description={
          <>
            <span className="font-mono tabular-nums">{items.length}</span> samtal i dag
            {(upcomingRes.count ?? 0) > 0 && (
              <>
                {" · "}
                <span className="font-mono tabular-nums">{upcomingRes.count}</span> kommande
              </>
            )}
          </>
        }
      />
      <RingpassView
        queue={items}
        timeline={timeline}
        scripts={scriptsRes.data ?? []}
        sendInfoTemplate={infoRes.data?.content ?? ""}
        todo={todo}
      />
    </div>
  );
}
