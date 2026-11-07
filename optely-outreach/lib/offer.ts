/** Erbjudanden (docs/saljsystem.md). Delas av server och klient. */

export type Offer = "optely" | "sba";
export type OfferFilter = Offer | "all";

export const OFFER_COOKIE = "or_offer";
export const OFFERS: Offer[] = ["optely", "sba"];

export const OFFER_LABEL: Record<OfferFilter, string> = {
  all: "Alla",
  optely: "Optely",
  sba: "SBA",
};

export function parseOffer(value: unknown): OfferFilter | null {
  return value === "optely" || value === "sba" || value === "all" ? value : null;
}

/** Erbjudanden som ska visas för ett filter. */
export function offersFor(filter: OfferFilter): Offer[] {
  return filter === "all" ? OFFERS : [filter];
}
