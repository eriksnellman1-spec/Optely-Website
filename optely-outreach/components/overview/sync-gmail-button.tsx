"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { syncPartnerGmail } from "@/lib/actions/gmail-sync";
import { cn } from "@/lib/utils";

export function SyncGmailButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await syncPartnerGmail();
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          toast.success("Synkar skickade partnermejl – listan uppdateras om en stund.");
          // n8n arbetar i bakgrunden; hämta om sidan några gånger medan mejlen kommer in.
          for (const ms of [8000, 20000, 45000]) setTimeout(() => router.refresh(), ms);
        })
      }
    >
      <RefreshCw className={cn(pending && "animate-spin")} /> Synka Gmail
    </Button>
  );
}
