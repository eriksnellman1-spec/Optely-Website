"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveWeeklyReview } from "@/lib/actions/reviews";
import type { Offer } from "@/lib/offer";

export function ReviewForm({ weekStart, offer, initial }: { weekStart: string; offer: Offer | null; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = notes !== saved;

  function save() {
    start(async () => {
      const r = await saveWeeklyReview({ weekStart, offer, notes });
      if (!r.ok) toast.error(r.error);
      else {
        setSaved(notes);
        toast.success("Sparat");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        aria-label="Vad ska ändras"
        rows={5}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            save();
          }
        }}
        placeholder="Vad ska ändras nästa vecka? T.ex. annan ringtid, nytt ämne i mejlet, fler SBA-samtal…"
      />
      <div className="flex items-center justify-end gap-3 text-xs text-subtle">
        {dirty ? <span className="text-status-yellow">Osparat</span> : saved ? <span>Sparat</span> : null}
        <Button size="sm" onClick={save} disabled={!dirty || pending}>
          <Save /> {pending ? "Sparar…" : "Spara"}
        </Button>
      </div>
    </div>
  );
}
