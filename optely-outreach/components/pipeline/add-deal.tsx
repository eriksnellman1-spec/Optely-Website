"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { useOptions } from "@/components/shell/use-options";
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
import type { Duplicate } from "@/lib/actions/contacts";
import { addToPipeline, type AddToPipelineInput, type PipelineStage } from "@/lib/actions/pipeline";
import { DEAL_STAGE_LABEL, PIPELINE_STAGES } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const SOURCES = ["Rekommendation", "Nätverk", "Partner", "Inkommande", "Egen kontakt", "Annat"] as const;

export function AddDealButton({
  defaultOffer,
  label = "Lägg till i pipeline",
  variant = "default",
}: {
  defaultOffer: Enums<"offer">;
  label?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lägg till i pipeline</DialogTitle>
            <DialogDescription>Skriv namnet: välj ett bolag som redan finns, eller skapa ett nytt.</DialogDescription>
          </DialogHeader>
          {open && <AddDealForm defaultOffer={defaultOffer} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddDealForm({ defaultOffer, onDone }: { defaultOffer: Enums<"offer">; onDone: () => void }) {
  const router = useRouter();
  const companies = useOptions("companies", true);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null);
  const [offer, setOffer] = useState<Enums<"offer">>(defaultOffer);
  const [stage, setStage] = useState<PipelineStage>("kontaktad");
  const [source, setSource] = useState<(typeof SOURCES)[number] | "">("");
  const [otherSource, setOtherSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{ input: AddToPipelineInput; matches: Duplicate[] } | null>(null);
  const [pending, start] = useTransition();

  const matches = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (picked || q.length < 2) return [];
    return companies.options.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 5);
  }, [name, picked, companies.options]);

  function send(input: AddToPipelineInput) {
    setError(null);
    setDuplicates(null);
    start(async () => {
      const r = await addToPipeline(input);
      if (!r.ok) {
        if ("duplicates" in r) setDuplicates({ input, matches: r.duplicates });
        else setError(r.error);
        return;
      }
      toast.success(`${picked?.label ?? input.companyName} → ${DEAL_STAGE_LABEL[input.stage]}`);
      onDone();
      router.refresh();
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    send({
      companyId: picked?.id ?? null,
      companyName: picked ? undefined : name,
      offer,
      stage,
      firstName: get("firstName"),
      lastName: get("lastName"),
      phone: get("phone"),
      email: get("email"),
      source: source === "Annat" ? otherSource.trim() || "Annat" : source,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ad-company">Företag</Label>
        <Input
          id="ad-company"
          value={picked ? picked.label : name}
          onChange={(e) => {
            setPicked(null);
            setName(e.target.value);
          }}
          placeholder="Bolagets namn"
          autoComplete="off"
          autoFocus
          required
        />
        {matches.length > 0 && (
          <ul aria-label="Befintliga bolag" className="overflow-hidden rounded-md border border-border">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setPicked({ id: m.id, label: m.label })}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                >
                  <span className="truncate">{m.label}</span>
                  <span className="shrink-0 text-xs text-subtle">{m.hint ?? "befintligt"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked ? (
          <p className="flex items-center gap-1.5 text-xs text-status-green">
            <Check className="size-3.5" /> Befintligt bolag
          </p>
        ) : (
          name.trim().length > 1 && (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Nytt bolag skapas</span>
              <div className="flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Erbjudande">
                {(["optely", "sba"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={offer === o}
                    onClick={() => setOffer(o)}
                    className={cn("rounded px-2 py-0.5", offer === o && "bg-accent text-foreground")}
                  >
                    {o === "sba" ? "SBA" : "Optely"}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Steg</Label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Steg">
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={stage === s}
              onClick={() => setStage(s)}
              className={cn(
                "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2",
                stage === s && "border-brand/50 bg-brand/10 text-foreground",
              )}
            >
              {DEAL_STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Kontaktperson" name="firstName" placeholder="Förnamn" />
        <Field label="Efternamn" name="lastName" />
        <Field label="Telefon" name="phone" type="tel" />
        <Field label="E-post" name="email" type="email" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ad-source">Källa</Label>
        <div className="flex gap-2">
          <select
            id="ad-source"
            value={source}
            onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number] | "")}
            required
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-surface px-2 text-sm"
          >
            <option value="" disabled>
              Varifrån kom affären?
            </option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {source === "Annat" && (
            <Input aria-label="Annan källa" value={otherSource} onChange={(e) => setOtherSource(e.target.value)} placeholder="Vad?" className="flex-1" />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-status-red">
          {error}
        </p>
      )}

      {duplicates && (
        <div role="alert" className="space-y-2 rounded-md border border-status-yellow/30 bg-status-yellow/10 p-3 text-sm">
          <p className="font-medium text-status-yellow">Bolaget verkar redan finnas.</p>
          <ul className="space-y-1">
            {duplicates.matches.map((d, i) => (
              <li key={`${d.companyId ?? d.name}-${i}`} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-foreground">{d.name}</span>
                <span className="text-muted-foreground">matchar på {d.matchedOn}</span>
                {d.companyId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setPicked({ id: d.companyId as string, label: d.name });
                      setDuplicates(null);
                    }}
                  >
                    Använd det
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => send({ ...duplicates.input, force: true })}>
              Skapa nytt ändå
            </Button>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Avbryt
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Sparar…" : "Lägg till"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`ad-${props.name}`}>{label}</Label>
      <Input id={`ad-${props.name}`} {...props} />
    </div>
  );
}
