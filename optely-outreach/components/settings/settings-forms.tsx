"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveNewPerDay, saveWeekPlan, type WeekPlanInput } from "@/lib/actions/settings";
import { CHANNEL_LABEL } from "@/lib/labels";

const DAY_NAME: Record<keyof WeekPlanInput, string> = {
  monday: "Måndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
  saturday: "Lördag",
  sunday: "Söndag",
};

export function WeekPlanForm({ initial }: { initial: WeekPlanInput }) {
  const [plan, setPlan] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(plan) !== JSON.stringify(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveWeekPlan(plan);
          if (!r.ok) toast.error(r.error);
          else toast.success("Veckoplanen är sparad");
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(DAY_NAME) as (keyof WeekPlanInput)[]).map((d) => (
          <label key={d} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <span>{DAY_NAME[d]}</span>
            <select
              aria-label={`Kanal ${DAY_NAME[d]}`}
              value={plan[d]}
              onChange={(e) => setPlan({ ...plan, [d]: e.target.value })}
              className="h-7 rounded-md border border-input bg-surface px-2 text-sm"
            >
              {Object.entries(CHANNEL_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!dirty || pending}>
          <Save /> {pending ? "Sparar…" : "Spara veckoplan"}
        </Button>
      </div>
    </form>
  );
}

export function NewPerDayForm({ initial }: { initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveNewPerDay(Number(value));
          if (!r.ok) toast.error(r.error);
          else toast.success("Sparat");
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input
        type="number"
        min={0}
        max={200}
        aria-label="Nya bolag per ringdag"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 text-right font-mono tabular-nums"
      />
      <span className="text-sm text-muted-foreground">nya bolag släpps in i ringkön per ringdag</span>
      <Button type="submit" size="sm" disabled={pending || Number(value) === initial}>
        <Save /> Spara
      </Button>
    </form>
  );
}
