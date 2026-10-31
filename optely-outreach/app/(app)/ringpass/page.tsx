import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Phone } from "lucide-react";

import { PlannedView } from "@/components/shell/planned-view";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Ringpass" };

export default function RingpassPage() {
  return (
    <PlannedView
      title="Ringpass"
      subtitle="Varma samtal, ett i taget – positiva svar hamnar överst."
      icon={Phone}
      emptyTitle="Ringpasset kommer här"
      emptyText="Varje positivt mejlsvar blir automatiskt en ringuppgift. Här ringer du dem i tur och ordning, helt utan mus, och loggar utfallet."
      step={2}
      features={[
        "Kö sorterad på prioritet – positiva svar först",
        "Manus och invändningar från Företagshjärnan vid sidan",
        "Logga utfall och boka möte med tangentbordet",
        "Fungerar från telefonen",
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/contacts">
            <Building2 />
            Se kontakterna
          </Link>
        </Button>
      }
    />
  );
}
