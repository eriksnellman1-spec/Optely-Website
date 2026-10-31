"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logPartnerCheckin } from "@/lib/actions/partners";
import { useShell } from "./shell-context";
import { useOptions } from "./use-options";

export function PartnerCheckinDialog() {
  const { dialog, closeDialog } = useShell();
  const open = dialog === "partner-checkin";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logga partner-check-in</DialogTitle>
          <DialogDescription>Håll nätverket varmt – notera vad ni pratade om.</DialogDescription>
        </DialogHeader>
        {open && <CheckinForm onDone={closeDialog} />}
      </DialogContent>
    </Dialog>
  );
}

function CheckinForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const partners = useOptions("partners", true);
  const [partnerId, setPartnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logPartnerCheckin({ partnerId, notes });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Check-in loggad");
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Partner</Label>
        <Select value={partnerId} onValueChange={setPartnerId}>
          <SelectTrigger className="w-full" aria-label="Välj partner">
            <SelectValue placeholder={partners.loaded ? "Välj partner…" : "Laddar…"} />
          </SelectTrigger>
          <SelectContent>
            {partners.options.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
                {p.hint && <span className="ml-2 text-xs text-subtle">{p.hint}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {partners.loaded && partners.options.length === 0 && (
          <p className="text-xs text-subtle">Inga partners ännu – lägg till dem under Partners.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="checkin-notes">Anteckning</Label>
        <Textarea
          id="checkin-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lunch, tips om kunder, nästa steg…"
          rows={4}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-status-red">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Avbryt
        </Button>
        <Button type="submit" disabled={pending || !partnerId}>
          {pending ? "Sparar…" : "Logga check-in"}
        </Button>
      </DialogFooter>
    </form>
  );
}
