"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Från så här många krävs att man skriver RADERA. */
export const TYPE_TO_CONFIRM = 10;

export type DeleteRequest = {
  title: string;
  description: string;
  count: number;
  /** Kräv RADERA oavsett antal (Radera alla). */
  requireWord?: boolean;
  run: () => Promise<boolean>;
};

/** Bekräftelse före radering. Vid 10 eller fler (och alltid vid Radera alla) måste man skriva RADERA. */
export function DeleteConfirm({ request, onClose }: { request: DeleteRequest | null; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const needsWord = Boolean(request?.requireWord) || (request?.count ?? 0) >= TYPE_TO_CONFIRM;
  const ready = !needsWord || typed.trim().toUpperCase() === "RADERA";

  function close() {
    setTyped("");
    onClose();
  }

  function confirm() {
    if (!request || !ready) return;
    start(async () => {
      if (await request.run()) close();
    });
  }

  return (
    <Dialog open={request !== null} onOpenChange={(o) => !o && !pending && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          <DialogDescription>{request?.description} Det går inte att ångra.</DialogDescription>
        </DialogHeader>
        {needsWord && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
            className="space-y-1.5"
          >
            <label htmlFor="confirm-word" className="text-sm text-muted-foreground">
              Skriv <span className="font-mono font-medium text-foreground">RADERA</span> för att bekräfta
            </label>
            <Input id="confirm-word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
          </form>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={pending}>
            Avbryt
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={!ready || pending} autoFocus={!needsWord}>
            <Trash2 /> {pending ? "Raderar…" : `Ja, radera ${request && request.count > 1 ? request.count : ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Rad ovanför en tabell: markera alla, radera markerade, radera alla. */
export function BulkBar({
  selected,
  visible,
  allChecked,
  onToggleAll,
  onClear,
  onDeleteSelected,
  onDeleteAll,
  deleteAllLabel,
}: {
  selected: number;
  visible: number;
  allChecked: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  deleteAllLabel: string;
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">
        <input type="checkbox" checked={allChecked} onChange={onToggleAll} className="size-4 accent-[var(--brand)]" aria-label="Markera alla som visas" />
        {selected > 0 ? (
          <span>
            <span className="font-mono text-foreground tabular-nums">{selected}</span> markerade
          </span>
        ) : (
          <span>Markera alla ({visible})</span>
        )}
      </label>
      {selected > 0 && (
        <>
          <Button size="sm" variant="outline" className="text-status-red" onClick={onDeleteSelected}>
            <Trash2 /> Radera markerade ({selected})
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Avmarkera
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-status-red" onClick={onDeleteAll}>
        <Trash2 /> {deleteAllLabel}
      </Button>
    </div>
  );
}
