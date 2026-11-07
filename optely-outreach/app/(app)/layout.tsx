import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { formatDate, formatWeekday } from "@/lib/format";
import { getOfferFilter } from "@/lib/offer-server";
import { getSetting, todaysPlan } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();

  const offer = await getOfferFilter();
  const [{ data: claims }, openCalls, notices, weekPlan] = await Promise.all([
    supabase.auth.getClaims(),
    // Samma urval som Ringpassets kö: öppna samtal/uppföljningar som förfaller i dag.
    offer === "all"
      ? supabase.from("ringpass_queue").select("task_id", { count: "exact", head: true })
      : supabase.from("ringpass_queue").select("task_id", { count: "exact", head: true }).eq("offer", offer),
    offer === "all"
      ? supabase.from("notices").select("task_id", { count: "exact", head: true })
      : supabase.from("notices").select("task_id", { count: "exact", head: true }).eq("offer", offer),
    getSetting(supabase, "week_plan"),
  ]);

  // proxy.ts skyddar redan, men dubbelkolla på servern.
  if (!claims?.claims?.sub) redirect("/login");

  const now = new Date();
  const email = typeof claims.claims.email === "string" ? claims.claims.email : null;

  return (
    <AppShell
      data={{
        email,
        openCallTasks: openCalls.count ?? 0,
        noticeCount: notices.count ?? 0,
        offer,
        dateLabel: formatDate(now),
        weekdayLabel: formatWeekday(now),
        todayPlan: todaysPlan(weekPlan, now),
      }}
    >
      {children}
    </AppShell>
  );
}
