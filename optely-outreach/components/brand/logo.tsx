import { cn } from "@/lib/utils";

/** Optely-märke: en enkel grön ring + punkt. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5", className)}>
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="var(--brand)" strokeWidth="3" />
      <circle cx="12" cy="12" r="2.5" fill="var(--brand)" />
    </svg>
  );
}
