import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Radar } from "lucide-react";

import { PlannedView } from "@/components/shell/planned-view";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Hem" };

export default function HomePage() {
  return (
    <PlannedView
      title="Hem"
      subtitle="Idag-lista och veckans siffror mot mål."
      icon={Radar}
      emptyTitle="Idag-listan och dashboarden kommer här"
      emptyText="Allt som ska göras i dag i alla kanaler, veckans siffror mot mål, pipeline per status och lördagsanalysen. Ringpasset fungerar redan."
      phase="C (idag-lista) och J (dashboard)"
      features={[
        "Idag-lista: samtal, SMS, LinkedIn, partner och offertpåminnelser",
        "Veckans siffror mot mål: försök, svar, bokade, genomförda, offerter, kunder",
        "Per kanal och bokade per timme av din tid",
        "Lördagsanalys med max 3 konkreta ändringar",
      ]}
      actions={
        <Button asChild>
          <Link href="/ringpass">
            <Phone />
            Till Ringpasset
          </Link>
        </Button>
      }
    />
  );
}
