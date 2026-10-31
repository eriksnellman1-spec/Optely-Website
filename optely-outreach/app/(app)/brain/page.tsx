import type { Metadata } from "next";

import { BrainEditor } from "@/components/brain/brain-editor";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Företagshjärnan" };

export default async function BrainPage({ searchParams }: PageProps<"/brain">) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("context_entries")
    .select("*")
    .order("sort_order")
    .order("title");

  if (error) throw new Error("Kunde inte läsa Företagshjärnan.");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Företagshjärnan"
        description="Profil, erbjudande, ICP, case och manus – kontexten som AI-texterna skrivs utifrån."
      />
      <BrainEditor entries={data} initialId={typeof id === "string" ? id : null} />
    </div>
  );
}
