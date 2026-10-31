import type { Metadata } from "next";
import { Handshake } from "lucide-react";

import { OpenDialogButton } from "@/components/shell/open-dialog-button";
import { PlannedView } from "@/components/shell/planned-view";

export const metadata: Metadata = { title: "Partners" };

export default function PartnersPage() {
  return (
    <PlannedView
      title="Partners"
      subtitle="IT-, bokförings- och webbpartners som skickar kunder."
      icon={Handshake}
      emptyTitle="Partnernätverket kommer här"
      emptyText="Översikt över partners, när ni senast hördes och vem som behöver en check-in. Redan nu kan du logga en check-in från kommandopaletten."
      step={5}
      features={[
        "Partners som inte hörts av på länge lyfts fram",
        "Historik över check-ins och tips",
        "Hänvisade bolag kopplade till partnern",
      ]}
      actions={
        <OpenDialogButton dialog="partner-checkin">
          <Handshake />
          Logga check-in
        </OpenDialogButton>
      }
    />
  );
}
