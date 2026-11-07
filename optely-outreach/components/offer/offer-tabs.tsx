import Link from "next/link";

import { OFFER_LABEL, type Offer } from "@/lib/offer";
import { cn } from "@/lib/utils";

/** Flikar Optely / SBA som länkar (?tab=). */
export function OfferTabs({ tabs, active, basePath }: { tabs: Offer[]; active: Offer; basePath: string }) {
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" className="flex w-fit gap-1 rounded-md border border-border p-0.5 text-sm">
      {tabs.map((t) => (
        <Link
          key={t}
          role="tab"
          aria-selected={t === active}
          href={`${basePath}?tab=${t}`}
          className={cn(
            "rounded px-3 py-1 text-muted-foreground hover:text-foreground",
            t === active && (t === "optely" ? "bg-brand/15 text-brand" : "bg-status-blue/15 text-status-blue"),
          )}
        >
          {OFFER_LABEL[t]}
        </Link>
      ))}
    </div>
  );
}
