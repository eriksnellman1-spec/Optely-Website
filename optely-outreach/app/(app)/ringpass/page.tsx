import type { Metadata } from "next";

import { RingpassView, type QueueItem, type TimelineEvent } from "@/components/ringpass/ringpass-view";
import { PageHeader } from "@/components/ui/page-header";
import { startOfTomorrowHelsinki } from "@/lib/format";
import { TodayFollowups } from "@/components/today/followups";
import { getOfferFilter } from "@/lib/offer-server";
import { loadFollowups } from "@/lib/queries/followups";
import { loadTodo } from "@/lib/queries/todo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Idag" };

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

export default async function RingpassPage({ searchParams }: PageProps<"/ringpass">) {
  const { task } = await searchParams;
  const offer = await getOfferFilter(searchParams);
  const supabase = await createClient();
  const tomorrow = startOfTomorrowHelsinki();

  let queueQuery = supabase.from("ringpass_queue").select("*").order("priority").order("due_at").limit(200);
  if (offer !== "all") queueQuery = queueQuery.eq("offer", offer);
  const queueRes = await queueQuery;
  if (queueRes.error) throw new Error("Kunde inte läsa Ringpassets kö.");

  const queue = queueRes.data.filter((q): q is typeof q & { task_id: string; company_id: string } =>
    Boolean(q.task_id && q.company_id),
  );
  const companyIds = [...new Set(queue.map((q) => q.company_id))];
  const none = Promise.resolve({ data: [], error: null });

  const startOfToday = new Date(new Date(tomorrow).getTime() - 86_400_000).toISOString();
  let todayQuery = supabase
    .from("activities")
    .select("channel, type, outcome, offer")
    .in("channel", ["samtal", "möte"])
    .gte("occurred_at", startOfToday)
    .lt("occurred_at", tomorrow);
  if (offer !== "all") todayQuery = todayQuery.eq("offer", offer);

  const [upcomingRes, scriptsRes, infoRes, todo, followups, callsRes, emailsRes, repliesRes, dealsRes, todayRes] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, company:companies(offer)")
        .eq("status", "open")
        .in("type", ["call", "follow_up"])
        .gte("due_at", tomorrow)
        .limit(1000),
      supabase
        .from("context_entries")
        .select("id, kind, title, content, offer")
        .in("kind", ["script", "objection"])
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("context_entries").select("content").eq("slug", "mejl-skicka-info").maybeSingle(),
      loadTodo(supabase, tomorrow, offer),
      loadFollowups(supabase, tomorrow, offer),
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
      companyIds.length
        ? supabase
            .from("deals")
            .select("company_id, stage, next_action, next_action_at")
            .in("company_id", companyIds)
            .not("stage", "in", "(kund,forlorad)")
        : Promise.resolve({ data: [] as { company_id: string; stage: string; next_action: string | null; next_action_at: string | null }[], error: null }),
      todayQuery,
    ]);

  const todayRows = todayRes.data ?? [];
  const today = {
    called: todayRows.filter((a) => a.channel === "samtal").length,
    answered: todayRows.filter((a) => a.channel === "samtal" && !["no_answer", "voicemail"].includes(a.outcome ?? "")).length,
    booked: todayRows.filter((a) => a.channel === "möte" && a.type === "bokat").length,
  };

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
    offer: q.offer,
    lastName: q.last_name,
    deal: (() => {
      const d = (dealsRes.data ?? []).find((x) => x.company_id === q.company_id && x.stage !== "kund" && x.stage !== "forlorad");
      return d ? { stage: d.stage, nextAction: d.next_action, nextActionAt: d.next_action_at } : null;
    })(),
  }));
  const upcoming = (upcomingRes.data ?? []).filter((t) => offer === "all" || t.company?.offer === offer).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Idag"
        description={
          <>
            <span className="font-mono tabular-nums">{items.length}</span> samtal i dag
            {upcoming > 0 && (
              <>
                {" · "}
                <span className="font-mono tabular-nums">{upcoming}</span> kommande
              </>
            )}
          </>
        }
      />
      <TodayFollowups data={followups} />
      <RingpassView
        queue={items}
        timeline={timeline}
        scripts={scriptsRes.data ?? []}
        sendInfoTemplate={infoRes.data?.content ?? ""}
        todo={todo}
        today={today}
        initialTaskId={typeof task === "string" ? task : null}
      />
    </div>
  );
}
