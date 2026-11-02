import type { Metadata } from "next";

import { RingpassView, type QueueItem, type TimelineEvent } from "@/components/ringpass/ringpass-view";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ringpass" };

const CALL_OUTCOME: Record<string, string> = {
  no_answer: "Inget svar",
  voicemail: "Röstmeddelande",
  callback: "Ring tillbaka",
  interested: "Intresserad",
  not_interested: "Inte intresserad",
  meeting_booked: "Möte bokat",
  wrong_person: "Fel person",
};

export default async function RingpassPage() {
  const supabase = await createClient();

  const queueRes = await supabase
    .from("ringpass_queue")
    .select("*")
    .order("priority")
    .order("due_at")
    .limit(200);
  if (queueRes.error) throw new Error("Kunde inte läsa Ringpassets kö.");

  const queue = queueRes.data.filter((q): q is typeof q & { task_id: string; company_id: string } =>
    Boolean(q.task_id && q.company_id),
  );
  const companyIds = [...new Set(queue.map((q) => q.company_id))];

  const [upcomingRes, scriptsRes, callsRes, emailsRes, repliesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .in("type", ["call", "follow_up"])
      .gt("due_at", new Date().toISOString()),
    supabase
      .from("context_entries")
      .select("id, kind, title, content")
      .in("kind", ["script", "objection"])
      .eq("is_active", true)
      .order("sort_order"),
    companyIds.length
      ? supabase
          .from("calls")
          .select("company_id, outcome, notes, called_at")
          .in("company_id", companyIds)
          .order("called_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? supabase
          .from("emails")
          .select("company_id, subject, status, sent_at, queued_at, created_at")
          .in("company_id", companyIds)
          .in("status", ["queued", "sent", "replied", "bounced"])
          .order("created_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
    companyIds.length
      ? supabase
          .from("replies")
          .select("company_id, body, classification, received_at")
          .in("company_id", companyIds)
          .order("received_at", { ascending: false })
          .limit(300)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const timeline: Record<string, TimelineEvent[]> = {};
  const push = (companyId: string, e: TimelineEvent) => (timeline[companyId] ??= []).push(e);
  for (const c of callsRes.data ?? []) {
    push(c.company_id, {
      at: c.called_at,
      kind: "call",
      text: CALL_OUTCOME[c.outcome] ?? c.outcome,
      detail: c.notes,
    });
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

  const items: QueueItem[] = queue.map((q) => ({
    taskId: q.task_id,
    taskType: q.task_type === "follow_up" ? "follow_up" : "call",
    title: q.title ?? "",
    description: q.description,
    priority: q.priority ?? 2,
    dueAt: q.due_at ?? new Date().toISOString(),
    isReply: Boolean(q.reply_id),
    taskStep: q.task_sequence_step,
    companyId: q.company_id,
    companyName: q.company_name ?? "",
    city: q.city,
    industry: q.industry,
    website: q.website,
    companyStatus: q.company_status,
    companyNotes: q.company_notes,
    sequenceStep: q.sequence_step,
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
      <RingpassView queue={items} timeline={timeline} scripts={scriptsRes.data ?? []} />
    </div>
  );
}
