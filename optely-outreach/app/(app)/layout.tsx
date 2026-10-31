import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { formatDate, formatWeekday } from "@/lib/format";
import { getSetting, todaysPlan } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();

  const [{ data: claims }, openCalls, weekPlan] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("type", "call"),
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
        dateLabel: formatDate(now),
        weekdayLabel: formatWeekday(now),
        todayPlan: todaysPlan(weekPlan, now),
      }}
    >
      {children}
    </AppShell>
  );
}
