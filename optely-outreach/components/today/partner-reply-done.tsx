"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markPartnerReplyHandled } from "@/lib/actions/partners";

export function PartnerReplyDone({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markPartnerReplyHandled(id);
          if (!r.ok) toast.error(r.error);
          else router.refresh();
        })
      }
    >
      <Check /> Hanterad
    </Button>
  );
}
