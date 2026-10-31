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
      subtitle="AI Gatekeeper och kampanjer."
      icon={Send}
      emptyTitle="AI Gatekeeper kommer här"
      emptyText="AI skriver en unik öppningsrad per bolag. Här godkänner, redigerar eller avvisar du dem innan de skickas via vald utskicksleverantör."
      step={3}
      features={[
        "Granska mejl med status 'Väntar på granskning' – j/k, a = godkänn, x = avvisa",
        "Kampanjer med dagsgräns och status",
        "Utskick via utbytbar leverantör (manuell, Smartlead, n8n-SMTP)",
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
