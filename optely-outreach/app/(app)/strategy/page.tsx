import type { Metadata } from "next";
import { LineChart } from "lucide-react";

import { PlannedView } from "@/components/shell/planned-view";

export const metadata: Metadata = { title: "Strategy" };

export default function StrategyPage() {
  return (
    <PlannedView
      title="Strategy"
      subtitle="KPI:er, kalkylator och veckorapport."
      icon={LineChart}
      emptyTitle="Strategy Room kommer här"
      emptyText="Nyckeltal från hela kedjan – skickade mejl, svarsfrekvens, samtal, bokade möten – och en kalkylator för hur mycket som behövs för att nå målen."
      step={6}
      features={[
        "KPI:er vecka för vecka med förändring",
        "Kalkylator: mejl → svar → möten → kunder",
        "AI-genererad veckorapport från n8n",
      ]}
    />
  );
}
