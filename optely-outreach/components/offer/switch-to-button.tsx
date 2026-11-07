"use client";

import { Button } from "@/components/ui/button";
import { OFFER_LABEL, type OfferFilter } from "@/lib/offer";
import { useOffer } from "./offer-context";

export function SwitchToOfferButton({ offer }: { offer: OfferFilter }) {
  const { setOffer } = useOffer();
  return (
    <Button variant="outline" onClick={() => setOffer(offer)}>
      Visa {OFFER_LABEL[offer]}
    </Button>
  );
}
