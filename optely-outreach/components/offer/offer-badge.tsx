import { OFFER_LABEL, type Offer } from "@/lib/offer";
import { cn } from "@/lib/utils";

/** Etikett för erbjudandet: Optely grön, SBA blå. */
export function OfferBadge({ offer, className }: { offer: Offer | null | undefined; className?: string }) {
  if (!offer) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[10px] font-semibold tracking-wide uppercase",
        offer === "optely" ? "bg-brand/15 text-brand" : "bg-status-blue/15 text-status-blue",
        className,
      )}
    >
      {OFFER_LABEL[offer]}
    </span>
  );
}
