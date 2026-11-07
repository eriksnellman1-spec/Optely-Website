import type { Metadata } from "next";

import { NewPerDayForm, WeekPlanForm } from "@/components/settings/settings-forms";
import { PageHeader } from "@/components/ui/page-header";
import type { WeekPlanInput } from "@/lib/actions/settings";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Inställningar" };

const DAYS: (keyof WeekPlanInput)[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function obj(v: Json | null | undefined): Record<string, Json | undefined> {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const [settingsRes, eventsRes] = await Promise.all([
    supabase.from("settings").select("key, value").in("key", ["week_plan", "ringpass"]),
    supabase
      .from("webhook_events")
      .select("id, source, event_type, received_at, processed_at, error")
      .order("received_at", { ascending: false })
      .limit(20),
  ]);
  if (settingsRes.error) throw new Error("Kunde inte läsa inställningarna.");

  const plan = obj(settingsRes.data.find((s) => s.key === "week_plan")?.value);
  const ringpass = obj(settingsRes.data.find((s) => s.key === "ringpass")?.value);
  const weekPlan = Object.fromEntries(
    DAYS.map((d) => {
      const day = obj(plan[d]);
      return [d, typeof day.channel === "string" ? day.channel : "off"];
    }),
  ) as WeekPlanInput;
  const newPerDay = typeof ringpass.new_per_day === "number" ? ringpass.new_per_day : 15;
  const events = eventsRes.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Inställningar" description="Veckoplan, ringpass och logg över inkommande händelser." />

      <Card title="Veckoplan" description="Vilken kanal som gäller per veckodag. Ringdagar styr när nya försök läggs i Idag.">
        <WeekPlanForm initial={weekPlan} />
      </Card>

      <Card title="Ringpass" description="Hur många nya bolag (första försöket) som släpps in per ringdag. Återuppringningar och svar räknas inte.">
        <NewPerDayForm initial={newPerDay} />
      </Card>

      <Card title="Senaste händelser" description="De 20 senaste raderna i webhook_events (n8n, cron). Bara läsning.">
        {events.length === 0 ? (
          <p className="text-sm text-subtle">Inga händelser än.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="h-8 border-b border-border text-left text-[11px] tracking-wide text-subtle uppercase">
                  <th className="pr-3 font-medium">Tid</th>
                  <th className="px-3 font-medium">Källa</th>
                  <th className="px-3 font-medium">Typ</th>
                  <th className="pl-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="h-8 border-b border-border/60 last:border-0">
                    <td className="pr-3 font-mono text-xs text-muted-foreground">{formatDateTime(e.received_at)}</td>
                    <td className="px-3">{e.source}</td>
                    <td className="px-3 text-muted-foreground">{e.event_type ?? "–"}</td>
                    <td className="pl-3 text-xs">
                      {e.error ? (
                        <span className="text-status-red">Fel: {e.error}</span>
                      ) : e.processed_at ? (
                        <span className="text-status-green">Klar</span>
                      ) : (
                        <span className="text-subtle">Mottagen</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
