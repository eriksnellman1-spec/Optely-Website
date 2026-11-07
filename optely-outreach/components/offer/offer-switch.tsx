"use client";

import { OFFER_LABEL, type OfferFilter } from "@/lib/offer";
import { cn } from "@/lib/utils";
import { useOffer } from "./offer-context";

const ORDER: OfferFilter[] = ["all", "optely", "sba"];

/** Växeln Alla / Optely / SBA – styr all data på alla sidor. */
export function OfferSwitch({ className }: { className?: string }) {
  const { offer, setOffer } = useOffer();
  return (
    <div
      role="radiogroup"
      aria-label="Erbjudande"
      className={cn("flex h-7 items-center rounded-md border border-border bg-surface p-0.5 text-xs", className)}
    >
      {ORDER.map((o) => {
        const active = offer === o;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setOffer(o)}
            className={cn(
              "h-6 rounded px-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && o === "all" && "bg-accent text-foreground",
              active && o === "optely" && "bg-brand/15 text-brand",
              active && o === "sba" && "bg-status-blue/15 text-status-blue",
            )}
          >
            {OFFER_LABEL[o]}
          </button>
        );
      })}
    </div>
  );
}
