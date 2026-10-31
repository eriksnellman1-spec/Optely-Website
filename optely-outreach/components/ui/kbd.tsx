import { cn } from "@/lib/utils";

/** Visar en tangent eller kombination, t.ex. <Kbd>⌘</Kbd><Kbd>K</Kbd> eller <Kbd keys={["g", "h"]} />. */
export function Kbd({
  children,
  keys,
  className,
}: {
  children?: React.ReactNode;
  keys?: string[];
  className?: string;
}) {
  const base =
    "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-2 px-1 font-mono text-[10px] font-medium text-muted-foreground";

  if (keys) {
    return (
      <span className={cn("inline-flex items-center gap-0.5", className)}>
        {keys.map((k, i) => (
          <kbd key={`${k}-${i}`} className={base}>
            {k}
          </kbd>
        ))}
      </span>
    );
  }

  return <kbd className={cn(base, className)}>{children}</kbd>;
}
