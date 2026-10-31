"use client";

import { CalendarDays, Search } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/kbd";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import { useShell } from "./shell-context";
import { UserMenu } from "./user-menu";

const CHANNEL_TONE: Record<string, StatusTone> = {
  phone: "green",
  email: "blue",
  partners: "yellow",
  strategy: "blue",
  off: "neutral",
};

export function Topbar({
  dateLabel,
  weekdayLabel,
  todayPlan,
  email,
}: {
  dateLabel: string;
  weekdayLabel: string;
  todayPlan: { channel: string; label: string } | null;
  email: string | null;
}) {
  const { openDialog, goPending } = useShell();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      <LogoMark className="size-5 md:hidden" />

      <div className="flex min-w-0 items-center gap-2 text-sm">
        <CalendarDays className="max-sm:hidden size-4 text-subtle sm:block" />
        <span className="capitalize text-muted-foreground">{weekdayLabel}</span>
        <span className="font-mono text-xs text-foreground tabular-nums">{dateLabel}</span>
      </div>

      <div className="max-sm:hidden h-4 w-px bg-border sm:block" />

      <div className="flex min-w-0 items-center gap-2 text-sm" title="Dagens kanal enligt veckoplanen">
        {todayPlan ? (
          <>
            <StatusDot tone={CHANNEL_TONE[todayPlan.channel] ?? "neutral"} />
            <span className="max-sm:hidden text-subtle sm:inline">I dag:</span>
            <span className="truncate">{todayPlan.label}</span>
          </>
        ) : (
          <span className="truncate text-subtle">Ingen veckoplan</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {goPending && (
          <span className="max-sm:hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Kbd>g</Kbd> gå till …
          </span>
        )}
        <button
          type="button"
          onClick={() => openDialog("palette")}
          className="max-lg:hidden h-7 items-center gap-2 rounded-md border border-border bg-surface px-2 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground lg:flex"
        >
          <Search className="size-3.5" />
          Sök eller hoppa till…
          <Kbd keys={["⌘", "K"]} className="ml-3" />
        </button>
        <UserMenu email={email} />
      </div>
    </header>
  );
}
