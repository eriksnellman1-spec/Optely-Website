import { cn } from "@/lib/utils";

export type StatusTone = "green" | "blue" | "yellow" | "red" | "neutral" | "brand";

const toneClass: Record<StatusTone, string> = {
  green: "bg-status-green",
  blue: "bg-status-blue",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
  neutral: "bg-subtle",
  brand: "bg-brand",
};

/**
 * Liten statusprick. grön = varm, blå = följ upp, gul = varning, röd = stopp.
 * `pulse` för saker som kräver uppmärksamhet nu.
 */
export function StatusDot({
  tone = "neutral",
  pulse = false,
  label,
  className,
}: {
  tone?: StatusTone;
  pulse?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex size-2 shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {pulse && (
        <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", toneClass[tone])} />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", toneClass[tone])} />
    </span>
  );
}
