"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { NAV_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

const MOBILE_ITEMS = NAV_ITEMS.filter((n) => n.mobile);

/** Bottenrad på mobil: de fyra viktigaste vyerna + sök (resten nås via paletten). */
export function MobileNav({ openCallTasks }: { openCallTasks: number }) {
  const pathname = usePathname();
  const { openDialog } = useShell();

  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {MOBILE_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const badge = item.href === "/ringpass" && openCallTasks > 0 ? openCallTasks : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground",
              active && "text-foreground",
            )}
          >
            <span className="relative">
              <Icon className="size-5" />
              {badge !== null && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-brand px-1 text-center font-mono text-[10px] leading-4 text-brand-foreground tabular-nums">
                  {badge}
                </span>
              )}
            </span>
            {item.label}
            {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" />}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => openDialog("palette")}
        className="flex h-14 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
      >
        <Search className="size-5" />
        Mer
      </button>
    </nav>
  );
}
