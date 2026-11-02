import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Send } from "lucide-react";

import { PlannedView } from "@/components/shell/planned-view";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Outreach" };

export default function OutreachPage() {
  return (
    <PlannedView
      title="Outreach"
      subtitle="Kall e-post via Smartlead och AI Gatekeeper."
      icon={Send}
      emptyTitle="AI Gatekeeper kommer här"
      emptyText="AI läser hemsidan och skriver en personlig första mening. Du godkänner den i Gatekeeper i början; sedan går mejl 1 dag 1, ringkön dag 2 och mejl 2 dag 3 automatiskt."
      phase="D (kall e-post)"
      features={[
        "Dubblettkontroll mot alla kanaler, partner och kunder",
        "AI-första mening från hemsidan – godkänn med a, avvisa med x",
        "Mejl 1 dag 1 → ringkön dag 2 → mejl 2 dag 3 via Smartlead",
        "Svar stoppar alla kanaler och ger dig en notis",
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/brain">
            <Brain />
            Fyll på Företagshjärnan
          </Link>
        </Button>
      }
    />
  );
}
