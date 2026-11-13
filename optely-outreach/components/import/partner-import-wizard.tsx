"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { importPartners, previewPartnerImport, type PartnerImportRow, type PartnerPreviewRow } from "@/lib/actions/import";
import { PARTNER_FIELDS, guessPartnerMapping, parseCsv, readCsvFile, type PartnerFieldKey } from "@/lib/csv";
import { PARTNER_TYPE } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Parsed = { fileName: string; headers: string[]; rows: string[][] };

export function PartnerImportWizard() {
  const router = useRouter();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<PartnerFieldKey, number> | null>(null);
  const [preview, setPreview] = useState<PartnerPreviewRow[] | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setError(null);
    setPreview(null);
    setResult(null);
    if (!file) return;
    try {
      const all = parseCsv(await readCsvFile(file));
      if (all.length < 2) {
        setError("Filen ser tom ut – den behöver en rubrikrad och minst en rad med byråer.");
        return;
      }
      const [headers, ...rows] = all;
      setParsed({ fileName: file.name, headers, rows });
      setMapping(guessPartnerMapping(headers));
    } catch {
      setError("Kunde inte läsa filen. Spara den som CSV (UTF-8 eller Excel-CSV) och försök igen.");
    }
  }

  const rows: PartnerImportRow[] = useMemo(() => {
    if (!parsed || !mapping) return [];
    return parsed.rows.map((r) => {
      const o: PartnerImportRow = {};
      for (const f of PARTNER_FIELDS) {
        const idx = mapping[f.key];
        if (idx >= 0 && r[idx]) o[f.key] = r[idx];
      }
      return o;
    });
  }, [parsed, mapping]);

  const summary = useMemo(() => {
    if (!preview) return null;
    const noName = rows.filter((r) => !r.name).length;
    const dups = preview.filter((p, i) => rows[i]?.name && p.duplicates.length > 0).length;
    const byType = new Map<string, number>();
    preview.forEach((p, i) => {
      if (rows[i]?.name) byType.set(p.type, (byType.get(p.type) ?? 0) + 1);
    });
    return { noName, dups, fresh: rows.length - dups - noName, byType };
  }, [preview, rows]);

  const toImport = summary ? summary.fresh + (includeDuplicates ? summary.dups : 0) : 0;

  return (
    <section aria-label="Importera partner" className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-medium">1. Välj fil</h2>
        <p className="text-xs text-muted-foreground">
          CSV med byråerna (Excel: Spara som → CSV). Första raden ska vara rubriker. Typen gissas ur typkolumnen eller namnet.
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-4 text-sm text-muted-foreground hover:bg-surface-2">
        <FileUp className="size-5 shrink-0" />
        <span className="min-w-0 truncate">{parsed ? `${parsed.fileName} – ${parsed.rows.length} rader` : "Klicka och välj en CSV-fil"}</span>
        <input type="file" accept=".csv,.txt,text/csv" className="sr-only" aria-label="CSV-fil" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>

      {parsed && mapping && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-medium">2. Koppla kolumner</h2>
            <p className="text-xs text-muted-foreground">Gissat utifrån rubrikerna – ändra om något blev fel.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_FIELDS.map((f) => (
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
          <Button
            disabled={pending}
            onClick={() => {
              setError(null);
              if (mapping.name < 0) {
                setError("Välj vilken kolumn som är byråns namn.");
                return;
              }
              start(async () => {
                const r = await previewPartnerImport(rows);
                if (!r.ok) setError(r.error);
                else setPreview(r.data);
              });
            }}
          >
            {pending && !preview ? "Kontrollerar…" : "Förhandsgranska"}
          </Button>
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
              {[...summary.byType].map(([t, n]) => `${n} ${PARTNER_TYPE[t as keyof typeof PARTNER_TYPE] ?? t}`).join(" · ")}
            </span>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="h-8 border-b border-border text-left text-[11px] tracking-wide text-subtle uppercase">
                  <th className="px-3 font-medium">#</th>
                  <th className="px-3 font-medium">Byrå</th>
                  <th className="px-3 font-medium">Typ</th>
                  <th className="px-3 font-medium">Kontakt</th>
                  <th className="px-3 font-medium">Kontroll</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = preview[i];
                  const dup = p?.duplicates ?? [];
                  return (
                    <tr key={i} className={cn("h-8 border-b border-border/60 last:border-0", (dup.length || !r.name) && "text-muted-foreground")}>
                      <td className="px-3 font-mono text-xs text-subtle">{i + 1}</td>
                      <td className="px-3">{r.name ?? <span className="text-status-red">saknar namn</span>}</td>
                      <td className="px-3 text-xs">{p ? PARTNER_TYPE[p.type] : ""}</td>
                      <td className="px-3 text-xs">{[r.contact_name, r.email ?? r.phone, r.city].filter(Boolean).join(" · ")}</td>
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
          <Button
            disabled={pending || toImport === 0}
            onClick={() =>
              start(async () => {
                const r = await importPartners(rows, !includeDuplicates);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setResult(r.data);
                toast.success(`${r.data.imported} partner importerade`);
                router.refresh();
              })
            }
          >
            <Upload /> {pending ? "Importerar…" : `Importera ${toImport} partner`}
          </Button>
        </div>
      )}

      {result && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 text-status-green" />
          <span>
            {result.imported} partner importerade, {result.skipped} hoppades över. Alla står som &quot;behöver höras&quot; tills du loggar en
            check-in.
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href="/partners">Till Partner</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
