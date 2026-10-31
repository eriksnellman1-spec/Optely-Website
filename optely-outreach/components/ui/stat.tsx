import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * KPI-siffra med etikett och förändring.
 * `change` i procent (t.ex. 12 eller -4). `invert` när lägre är bättre.
 */
export function Stat({
  label,
  value,
  unit,
  change,
  changeLabel = "mot förra veckan",
  invert = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  change?: number | null;
  changeLabel?: string;
  invert?: boolean;
  className?: string;
}) {
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const direction = !hasChange || change === 0 ? "flat" : change > 0 ? "up" : "down";
  const good = direction === "flat" ? null : (direction === "up") !== invert;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : ArrowRight;

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-medium tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hasChange && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            good === null ? "text-muted-foreground" : good ? "text-status-green" : "text-status-red",
          )}
        >
          <Icon className="size-3.5" />
          <span className="font-mono tabular-nums">
            {change > 0 ? "+" : ""}
            {change.toLocaleString("sv-FI", { maximumFractionDigits: 1 })} %
          </span>
          <span className="text-subtle">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
