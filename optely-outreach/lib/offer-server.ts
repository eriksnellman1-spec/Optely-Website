import "server-only";

import { cookies } from "next/headers";

import { OFFER_COOKIE, parseOffer, type OfferFilter } from "@/lib/offer";

/** Valt erbjudande: ?offer= i URL:en går före cookien. Standard: alla. */
export async function getOfferFilter(searchParams?: Promise<Record<string, string | string[] | undefined>>) {
  const params = searchParams ? await searchParams : {};
  const fromUrl = parseOffer(Array.isArray(params.offer) ? params.offer[0] : params.offer);
  if (fromUrl) return fromUrl;
  const store = await cookies();
  return parseOffer(store.get(OFFER_COOKIE)?.value) ?? ("all" satisfies OfferFilter);
}
