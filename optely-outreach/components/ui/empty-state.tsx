import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Tomt tillstånd: förklarar vad som saknas och erbjuder nästa handling. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-surface">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <div className="mt-1.5 max-w-md text-sm text-balance text-muted-foreground">{description}</div>
      )}
      {children}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
