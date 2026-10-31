import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { PlannedView } from "@/components/shell/planned-view";
import { Kbd } from "@/components/ui/kbd";

export const metadata: Metadata = { title: "Inställningar" };

export default function SettingsPage() {
  return (
    <PlannedView
      title="Inställningar"
      subtitle="Veckoplan, utskicksleverantör och konto."
      icon={Settings}
      emptyTitle="Inställningarna kommer här"
      emptyText="Värdena finns redan i tabellen settings (week_plan, outbound, external_caller_unlock) och kan ändras i Supabase tills vidare."
      step={4}
      features={[
        "Veckoplan: kanal per veckodag",
        "Utskicksleverantör: manuell, Smartlead eller n8n-SMTP",
        "Webhook-logg från n8n",
      ]}
      actions={
        <OpenDialogButton dialog="shortcuts">
          Visa kortkommandon <Kbd>?</Kbd>
        </OpenDialogButton>
      }
    />
  );
}
