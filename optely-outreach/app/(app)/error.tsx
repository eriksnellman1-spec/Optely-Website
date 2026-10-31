"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Något gick fel"
      description={
        <>
          Vyn kunde inte laddas. Kontrollera anslutningen till Supabase och försök igen.
          {error.digest && <span className="mt-2 block font-mono text-xs text-subtle">Felkod: {error.digest}</span>}
        </>
      }
      action={
        <Button variant="outline" onClick={reset}>
          <RotateCcw />
          Försök igen
        </Button>
      }
    />
  );
}
