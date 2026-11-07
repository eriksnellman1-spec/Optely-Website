"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { moveDealStage, type DealStage } from "@/lib/actions/companies";
import { DEAL_STAGE_LABEL } from "@/lib/labels";

const OPTIONS: DealStage[] = ["kontaktad", "svar", "mote_bokat", "mote_hallet", "offert", "kund", "forlorad"];

export function MoveStage({ companyId, stage, companyName }: { companyId: string; stage: DealStage; companyName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={`Flytta ${companyName}`}
      value={stage}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as DealStage;
        start(async () => {
          const r = await moveDealStage(companyId, next);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success(`${companyName} → ${DEAL_STAGE_LABEL[next]}`);
            router.refresh();
          }
        });
      }}
      className="h-7 rounded-md border border-input bg-surface px-1.5 text-xs text-muted-foreground disabled:opacity-50"
    >
      {OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s === stage ? DEAL_STAGE_LABEL[s] : `→ ${DEAL_STAGE_LABEL[s]}`}
        </option>
      ))}
    </select>
  );
}
