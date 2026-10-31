import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="Sidan finns inte"
        description="Länken kan vara gammal. Gå tillbaka till startsidan eller tryck ⌘K för att söka."
        action={
          <Button asChild variant="outline">
            <Link href="/">Till Hem</Link>
          </Button>
        }
        className="w-full max-w-md"
      />
    </main>
  );
}
