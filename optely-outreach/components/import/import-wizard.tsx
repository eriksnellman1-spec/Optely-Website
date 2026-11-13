"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileUp, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { OfferBadge } from "@/components/offer/offer-badge";
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
import { clearTestData, importCompanies, previewImport, type ImportRow, type PreviewRow } from "@/lib/actions/import";
import { IMPORT_FIELDS, guessMapping, parseCsv, readCsvFile, type ImportFieldKey } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Parsed = { fileName: string; headers: string[]; rows: string[][] };

export function ImportWizard() {
  const router = useRouter();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<ImportFieldKey, number> | null>(null);
  const [source, setSource] = useState("Ringlista");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; contacts: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setError(null);
    setPreview(null);
    setResult(null);
    if (!file) return;
    try {
      const text = await readCsvFile(file);
      const all = parseCsv(text);
      if (all.length < 2) {
        setError("Filen ser tom ut – den behöver en rubrikrad och minst en rad med bolag.");
        return;
      }
      const [headers, ...rows] = all;
      setParsed({ fileName: file.name, headers, rows });
      setMapping(guessMapping(headers));
    } catch {
      setError("Kunde inte läsa filen. Spara den som CSV (UTF-8 eller Excel-CSV) och försök igen.");
    }
  }

  const importRows: ImportRow[] = useMemo(() => {
    if (!parsed || !mapping) return [];
    return parsed.rows.map((r) => {
      const o: ImportRow = { source };
      for (const f of IMPORT_FIELDS) {
        const idx = mapping[f.key];
        if (idx >= 0 && r[idx]) o[f.key] = r[idx];
      }
      return o;
    });
  }, [parsed, mapping, source]);

  const summary = useMemo(() => {
    if (!preview) return null;
    const noName = importRows.filter((r) => !r.name).length;
    const dups = preview.filter((p) => p.duplicates.length > 0).length;
    return {
      total: importRows.length,
      noName,
      dups,
      fresh: importRows.length - dups - noName,
      sba: preview.filter((p) => p.offer === "sba").length,
      optely: preview.filter((p) => p.offer === "optely").length,
    };
  }, [preview, importRows]);

  function runPreview() {
    setError(null);
    if (!mapping || mapping.name < 0) {
      setError("Välj vilken kolumn som är företagsnamn.");
      return;
    }
    start(async () => {
      const r = await previewImport(importRows);
      if (!r.ok) setError(r.error);
      else setPreview(r.data);
    });
  }

  function runImport() {
    start(async () => {
      const r = await importCompanies(importRows, !includeDuplicates);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult(r.data);
      toast.success(`${r.data.imported} bolag importerade`);
      router.refresh();
    });
  }

  return (
    <section aria-label="Importera CSV" className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-medium">1. Välj fil</h2>
        <p className="text-xs text-muted-foreground">
          CSV från PRH, Profinder eller Excel (spara som CSV). Första raden ska vara rubriker.
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-4 text-sm text-muted-foreground hover:bg-surface-2">
        <FileUp className="size-5" />
        <span>{parsed ? `${parsed.fileName} – ${parsed.rows.length} rader` : "Klicka och välj en CSV-fil"}</span>
        <input
          type="file"
          accept=".csv,.txt,text/csv"
          className="sr-only"
          aria-label="CSV-fil"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {parsed && mapping && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">2. Koppla kolumner</h2>
            <p className="text-xs text-muted-foreground">Gissat utifrån rubrikerna – ändra om något blev fel.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                <span className={cn("shrink-0", "required" in f && f.required && "font-medium")}>
                  {f.label}
                  {"required" in f && f.required && " *"}
                </span>
                <select
                  aria-label={`Kolumn för ${f.label}`}
                  value={mapping[f.key]}
                  onChange={(e) => {
                    setMapping({ ...mapping, [f.key]: Number(e.target.value) });
                    setPreview(null);
                  }}
                  className="h-7 min-w-0 max-w-[60%] rounded-md border border-input bg-surface px-1.5 text-xs"
                >
                  <option value={-1}>– ingen –</option>
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Kolumn ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="imp-source">Källa</Label>
              <Input id="imp-source" value={source} onChange={(e) => setSource(e.target.value)} className="w-48" />
            </div>
            <Button onClick={runPreview} disabled={pending}>
              {pending && !preview ? "Kontrollerar…" : "Förhandsgranska"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-status-red">
          <AlertTriangle className="size-4" /> {error}
        </p>
      )}

      {preview && summary && !result && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">3. Kontrollera och importera</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              <span className="font-mono tabular-nums">{summary.fresh}</span> nya
            </span>
            <span className="text-status-yellow">
              <span className="font-mono tabular-nums">{summary.dups}</span> dubbletter
            </span>
            {summary.noName > 0 && (
              <span className="text-status-red">
                <span className="font-mono tabular-nums">{summary.noName}</span> saknar namn
              </span>
            )}
            <span className="text-muted-foreground">
              <span className="font-mono">{summary.optely}</span> Optely · <span className="font-mono">{summary.sba}</span> SBA (bygg, VVS, el, måleri, tak)
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="h-8 border-b border-border text-left text-[11px] tracking-wide text-subtle uppercase">
                  <th className="px-3 font-medium">#</th>
                  <th className="px-3 font-medium">Bolag</th>
                  <th className="px-3 font-medium">Bransch · Ort</th>
                  <th className="px-3 font-medium">Erbjudande</th>
                  <th className="px-3 font-medium">Kontroll</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r, i) => {
                  const p = preview[i];
                  const dup = p?.duplicates ?? [];
                  return (
                    <tr key={i} className={cn("h-8 border-b border-border/60 last:border-0", (dup.length || !r.name) && "text-muted-foreground")}>
                      <td className="px-3 font-mono text-xs text-subtle">{i + 1}</td>
                      <td className="px-3">{r.name ?? <span className="text-status-red">saknar namn</span>}</td>
                      <td className="px-3 text-xs">{[r.industry, r.city ?? r.postal_city].filter(Boolean).join(" · ")}</td>
                      <td className="px-3">{p && <OfferBadge offer={p.offer} />}</td>
                      <td className="px-3 text-xs">
                        {!r.name ? (
                          <span className="text-status-red">hoppas över</span>
                        ) : dup.length ? (
                          <span className="text-status-yellow">
                            Dubblett: {dup[0].name} ({dup[0].matched_on})
                          </span>
                        ) : (
                          <span className="text-status-green">Ny</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={includeDuplicates}
              onChange={(e) => setIncludeDuplicates(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            Importera även dubbletter (rekommenderas inte)
          </label>
          <Button onClick={runImport} disabled={pending || summary.fresh + (includeDuplicates ? summary.dups : 0) === 0}>
            <Upload /> {pending ? "Importerar…" : `Importera ${summary.fresh + (includeDuplicates ? summary.dups : 0)} bolag`}
          </Button>
        </div>
      )}

      {result && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 text-status-green" />
          <span>
            {result.imported} bolag importerade ({result.contacts} kontakter), {result.skipped} hoppades över. De får status Ny och
            släpps in i Idag enligt antalet nya per ringdag (Inställningar).
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href="/contacts">Till Företag</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

export function ClearTestData({ companies, partners }: { companies: number; partners: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const total = companies + partners;

  return (
    <section aria-label="Töm testdata" className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Töm testdata</h2>
      <p className="text-xs text-muted-foreground">
        Tar bort de påhittade bolagen och partnerna (adresser som slutar på .test) med allt som hör till dem. Manus, mallar,
        inställningar och riktiga bolag lämnas orörda.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">
          <span className="font-mono tabular-nums">{companies}</span> testbolag · <span className="font-mono tabular-nums">{partners}</span>{" "}
          testpartner
        </span>
        <Button variant="outline" size="sm" disabled={total === 0} onClick={() => setOpen(true)} className="text-status-red">
          <Trash2 /> Töm testdata
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Töm testdata?</DialogTitle>
            <DialogDescription>
              {companies} bolag och {partners} partner med .test-adresser tas bort permanent, med samtal, mejl, uppgifter och
              affärer. Det går inte att ångra.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await clearTestData();
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(`${r.data.companies} testbolag och ${r.data.partners} testpartner borttagna`);
                    setOpen(false);
                    router.refresh();
                  }
                })
              }
            >
              {pending ? "Tömmer…" : "Ja, töm testdata"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
