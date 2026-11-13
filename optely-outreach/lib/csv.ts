/** Enkel CSV-läsare: avgränsare ; , eller tab, citattecken, radbrytningar inom citat, BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = { ";": 0, ",": 0, "\t": 0 } as Record<string, number>;
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch] += 1;
  }
  const delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ",") as string;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

/** Läser filen som UTF-8, och som Windows-1252 om UTF-8 ger trasiga tecken (vanligt för Excel-export). */
export async function readCsvFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buf);
}

export const IMPORT_FIELDS = [
  { key: "name", label: "Företagsnamn", required: true },
  { key: "business_id", label: "FO-nummer / Y-tunnus" },
  { key: "city", label: "Kommun" },
  { key: "postal_city", label: "Postort" },
  { key: "industry", label: "Bransch" },
  { key: "employees", label: "Anställda" },
  { key: "revenue_eur", label: "Omsättning (€)" },
  { key: "phone", label: "Telefon" },
  { key: "ceo_name", label: "VD" },
  { key: "email", label: "E-post" },
  { key: "website", label: "Webb" },
  { key: "notes", label: "Anteckning" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Vanliga rubriker från PRH, Profinder och egna listor (svenska, finska, engelska). */
const GUESSES: Record<ImportFieldKey, string[]> = {
  name: ["företag", "företagsnamn", "bolag", "namn", "firma", "nimi", "yritys", "yrityksen nimi", "toiminimi", "company", "company name", "name"],
  business_id: ["fo-nummer", "fo nummer", "fo-nr", "y-tunnus", "ytunnus", "business id", "org.nr", "organisationsnummer"],
  city: ["kommun", "hemkommun", "kunta", "kotikunta", "municipality"],
  postal_city: ["postort", "postanstalt", "postitoimipaikka", "ort", "stad", "city"],
  industry: ["bransch", "näringsgren", "verksamhet", "toimiala", "industry", "branch"],
  employees: ["anställda", "personal", "antal anställda", "storlek", "henkilöstö", "henkilöstömäärä", "henkilökunta", "employees"],
  revenue_eur: ["omsättning", "liikevaihto", "revenue", "turnover"],
  phone: ["telefon", "tel", "telefonnummer", "puhelin", "puhelinnumero", "phone"],
  ceo_name: ["vd", "verkställande direktör", "toimitusjohtaja", "ceo", "kontaktperson", "kontakt", "yhteyshenkilö"],
  email: ["e-post", "epost", "email", "e-mail", "sähköposti", "mejl"],
  website: ["webb", "webbplats", "hemsida", "www", "kotisivu", "kotisivut", "website", "url"],
  notes: ["anteckning", "kommentar", "notering", "huomio", "notes"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-zåäöüé0-9]+/g, " ").trim();

/** Gissar vilken kolumn som hör till vilket fält. Returnerar kolumnindex eller -1. */
export function guessMapping(headers: string[]): Record<ImportFieldKey, number> {
  const used = new Set<number>();
  const out = {} as Record<ImportFieldKey, number>;
  const h = headers.map(norm);
  for (const f of IMPORT_FIELDS) {
    const cands = GUESSES[f.key].map(norm);
    let idx = h.findIndex((x, i) => !used.has(i) && cands.includes(x));
    if (idx === -1) idx = h.findIndex((x, i) => !used.has(i) && cands.some((c) => c.length > 3 && x.includes(c)));
    if (idx !== -1) used.add(idx);
    out[f.key] = idx;
  }
  return out;
}
