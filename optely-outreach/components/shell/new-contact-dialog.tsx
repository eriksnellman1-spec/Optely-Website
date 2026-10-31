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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContact } from "@/lib/actions/contacts";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";
import { useOptions } from "./use-options";

export function NewContactDialog() {
  const { dialog, closeDialog } = useShell();
  const open = dialog === "new-contact";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ny kontakt</DialogTitle>
          <DialogDescription>Lägg till en person på ett befintligt eller nytt bolag.</DialogDescription>
        </DialogHeader>
        {/* Nyckel så att formuläret nollställs varje gång dialogen öppnas */}
        {open && <NewContactForm onDone={closeDialog} />}
      </DialogContent>
    </Dialog>
  );
}

function NewContactForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const companies = useOptions("companies", true);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [companyId, setCompanyId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    setError(null);

    startTransition(async () => {
      const result = await createContact({
        companyId: mode === "existing" ? companyId || null : null,
        companyName: mode === "new" ? get("companyName") : undefined,
        companyCity: mode === "new" ? get("companyCity") : undefined,
        firstName: get("firstName"),
        lastName: get("lastName"),
        role: get("role"),
        email: get("email"),
        phone: get("phone"),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Kontakten är sparad");
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Bolag</Label>
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {(["existing", "new"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded px-2 py-0.5 text-muted-foreground",
                  mode === m && "bg-accent text-foreground",
                )}
              >
                {m === "existing" ? "Befintligt" : "Nytt bolag"}
              </button>
            ))}
          </div>
        </div>
        {mode === "existing" ? (
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-full" aria-label="Välj bolag">
              <SelectValue placeholder={companies.loaded ? "Välj bolag…" : "Laddar bolag…"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {companies.options.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                  {c.hint && <span className="ml-2 text-xs text-subtle">{c.hint}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <Input name="companyName" placeholder="Bolagets namn" required />
            <Input name="companyCity" placeholder="Ort" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Förnamn" name="firstName" required autoFocus />
        <Field label="Efternamn" name="lastName" />
        <Field label="Roll" name="role" placeholder="VD, ägare…" />
        <Field label="Telefon" name="phone" type="tel" />
        <Field label="E-post" name="email" type="email" className="col-span-2" />
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
        <Button type="submit" disabled={pending}>
          {pending ? "Sparar…" : "Spara kontakt"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={`nc-${props.name}`}>{label}</Label>
      <Input id={`nc-${props.name}`} {...props} />
    </div>
  );
}
