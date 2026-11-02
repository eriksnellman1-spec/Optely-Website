import { Mail, Phone } from "lucide-react";

import { SEQUENCE_STEPS, stepInfo } from "@/lib/sequence";
import { cn } from "@/lib/utils";

/** Åtta segment: avklarade, nuvarande och kommande steg i uppföljningssekvensen. */
export function SequenceProgress({ current }: { current: number | null }) {
  const info = stepInfo(current);
  return (
    <div>
      <div className="flex gap-1" aria-hidden>
        {SEQUENCE_STEPS.map((s) => (
          <div
            key={s.step}
            title={`${s.step}. ${s.label}`}
            className={cn(
              "flex h-6 flex-1 items-center justify-center rounded-sm border text-[10px]",
              current !== null && s.step < current && "border-transparent bg-surface-2 text-subtle",
              s.step === current && "border-brand/50 bg-brand/15 text-brand",
              (current === null || s.step > current) && "border-border text-subtle",
            )}
          >
            {s.channel === "phone" ? <Phone className="size-3" /> : <Mail className="size-3" />}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {info ? (
          <>
            Steg <span className="font-mono">{info.step}</span> av 8 · {info.label}
          </>
        ) : (
          "Utanför sekvensen"
        )}
      </p>
    </div>
  );
}
