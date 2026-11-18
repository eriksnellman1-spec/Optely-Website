import "server-only";

import type { NextStep } from "@/components/partners/partner-step";
import type { Tables } from "@/lib/supabase/types";

export function toNextStep(r: Tables<"partner_next_step">): NextStep | null {
  if (!r.id) return null;
  return {
    partnerId: r.id,
    name: r.name ?? "Partner",
    status: r.status ?? "ny",
    step: r.step,
    label: r.step_label,
    channel: r.step_channel,
    due: r.due_date,
    overdue: Boolean(r.overdue),
    threadId: r.thread_id,
    replySubject: r.reply_subject,
    replySnippet: r.reply_snippet,
  };
}
