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
      subtitle="War Room – veckans läge på en skärm."
      icon={Radar}
      emptyTitle="War Room kommer här"
      emptyText="Här ser du veckoplanen, dagens möten från kalendern och tratten från kall kontakt till bokat möte."
      step={4}
      features={[
        "Veckoplan: vilken kanal som gäller per dag",
        "Kalendersynk med dagens och veckans möten",
        "Tratt: kontaktade → svar → varma → möten",
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
