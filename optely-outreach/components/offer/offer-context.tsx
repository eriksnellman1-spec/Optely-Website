"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { OFFER_COOKIE, parseOffer, type OfferFilter } from "@/lib/offer";

type OfferContextValue = { offer: OfferFilter; setOffer: (o: OfferFilter) => void };

const OfferContext = createContext<OfferContextValue | null>(null);

export function useOffer() {
  const ctx = useContext(OfferContext);
  if (!ctx) throw new Error("useOffer måste användas inom OfferProvider");
  return ctx;
}

/** Håller valt erbjudande: URL (?offer=) först, annars cookien från servern. */
export function OfferProvider({ initial, children }: { initial: OfferFilter; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const offer = parseOffer(searchParams.get("offer")) ?? initial;

  const setOffer = useCallback(
    (next: OfferFilter) => {
      document.cookie = `${OFFER_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      const params = new URLSearchParams(searchParams.toString());
      params.set("offer", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(() => ({ offer, setOffer }), [offer, setOffer]);
  return <OfferContext value={value}>{children}</OfferContext>;
}
