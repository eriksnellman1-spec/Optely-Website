"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { NAV_ITEMS } from "@/lib/nav";
import { useShell } from "./shell-context";

const GENERAL: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Kommandopalett (Ctrl+K på Windows)" },
  { keys: ["?"], label: "Visa kortkommandon" },
  { keys: ["c"], label: "Ny kontakt" },
  { keys: ["["], label: "Fäll ihop / ut sidomenyn" },
  { keys: ["Esc"], label: "Stäng dialog" },
];

const VIEW: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "S"], label: "Spara (Företagshjärnan)" },
  { keys: ["/"], label: "Fokusera sökfältet (Kontakter)" },
];

export function ShortcutsDialog() {
  const { dialog, closeDialog } = useShell();

  return (
    <Dialog open={dialog === "shortcuts"} onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Kortkommandon</DialogTitle>
          <DialogDescription>Allt går att nå utan mus.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <Section title="Allmänt" rows={GENERAL} />
          <Section
            title="Navigera"
            rows={NAV_ITEMS.map((n) => ({ keys: ["g", n.key], label: n.label }))}
          />
          <Section title="I vyerna" rows={VIEW} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, rows }: { title: string; rows: { keys: string[]; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-medium tracking-wide text-subtle uppercase">{title}</h3>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <Kbd keys={r.keys} />
          </li>
        ))}
      </ul>
    </div>
  );
}
