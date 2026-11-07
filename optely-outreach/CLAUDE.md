# Optely Outreach Runtime (O.R.)

Ett personligt sälj- och outreach-system för Optely (AI- och automationsbyrå i Jakobstad).
En användare: Erik. Målet: återkommande intäkt – kalla kontakter → behovssamtal → kunder.

Den här filen är projektets bestående kontext. Läs den före varje uppgift.

**Specen för hela säljsystemet ligger i [`docs/saljsystem.md`](docs/saljsystem.md) och är sanningen för vad
som ska byggas** (kanaler, utfall, statusar, regler, beslut och byggordning). Läs den före varje fas.

## Arbetsregel

- **Fråga alltid med flerval innan du bygger** när något i specen är oklart eller kan tolkas på flera sätt.
  Gissa aldrig. Lägg till besluten i tabellen "Beslut under bygget" i `docs/saljsystem.md`.
- Förklara alltid vad ett steg är till för när Erik ska göra något själv. Ett steg i taget.

## Säljmodellen

Två erbjudanden i samma app: **Optely** (AI-automation av administration) och **SBA** (fler bokade kunder åt
hantverkare). Ett företag har ett aktivt erbjudande (`companies.offer`): bygg/VVS/el/måleri/tak = SBA, övriga =
Optely. Växeln Alla / Optely / SBA högst upp styr all data. Kanaler: kall e-post, samtal, LinkedIn, partner
(bara Optely) – se `docs/saljsystem.md`. Kärnregler:

1. Ett företag = en rad. Dubbletter (e-postdomän, telefon, namn) stoppas och visas.
2. Svar i en kanal stoppar alla andra kanaler. Nej / Kontakta ej stoppar allt, permanent.
3. Partnerägda företag kontaktas inte kallt. Kunder ligger utanför sekvenserna.
4. Inga fasta mål, milstolpar eller stoppregler i UI:t – bara mätning.

## Stack

- Next.js (senaste stabila, App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (Radix) + Lucide-ikoner
- Supabase: Postgres, Auth, Realtime (`@supabase/ssr` + `@supabase/supabase-js`)
- `cmdk` (kommandopalett), `sonner` (toasts), `motion` (övergångar, sparsamt)
- n8n (self-hosted) sköter allt i bakgrunden: utskick, svarsklassning, kalendersynk, AI-rapporter
- Hosting: Vercel, kod på GitHub
- Grafer: ren SVG – inga tunga diagrambibliotek

## Arkitekturprinciper

- **Databasen är sanningen.** Schemat ligger i `supabase/migrations/0001_init.sql`. Ändra aldrig tabeller i UI-kod – skriv en ny migration.
- **Typade queries.** Generera typer med `supabase gen types typescript` till `lib/supabase/types.ts` och använd dem överallt.
- **Server först.** Läs data i Server Components; mutationer via Server Actions. Klientkomponenter bara där interaktivitet kräver det.
- **Optimistiska uppdateringar** för allt Erik klickar på i Ringpasset och Gatekeeper – UI:t ska aldrig vänta.
- **Utskick är en adapter.** All kod som skickar mejl går via `lib/outbound/provider.ts` (interface) med implementationer `smartlead`, `n8n-smtp`, `manual`. Vald leverantör läses från `settings.outbound.provider`. Ingen annan kod får känna till Smartlead.
- **Webhooks från n8n**: varje route under `app/api/webhooks/*` ska (1) verifiera headern `x-optely-secret` mot `WEBHOOK_SECRET`, (2) logga rå payload i `webhook_events`, (3) bearbeta, (4) sätta `processed_at` eller `error`. Använd service role-klienten bara i dessa routes och i `app/api/cron/*` (skyddas med `CRON_SECRET`).
- **Säkerhet**: hela appen bakom inloggning (middleware). Publik signup är avstängd i Supabase. `SUPABASE_SERVICE_ROLE_KEY` får aldrig nå klienten.
- **Avregistrering respekteras alltid**: kontakter/bolag med `do_not_contact = true` får aldrig hamna i en utskicksbatch.

## Mappstruktur

```
app/
  (auth)/login/           inloggning
  (app)/layout.tsx        appskal: sidomeny, topbar, ⌘K
  (app)/page.tsx          Översikt
  (app)/ringpass/         Idag (samtalslistan)
  (app)/contacts/         Företag + kontaktkort med historik
  (app)/pipeline/
  (app)/customers/
  (app)/scripts/          Manus och sekvenser
  (app)/partners/
  (app)/strategy/         Lördagsanalys
  (app)/outreach/         mejl per status
  (app)/brain/            Företagshjärnan (context_entries)
  (app)/settings/
  api/webhooks/           n8n → appen
components/
  ui/                     shadcn-komponenter
  shell/                  sidomeny, kommandopalett, topbar
  <modul>/                komponenter per vy
lib/
  supabase/               server-, browser- och service-klienter + types.ts
  outbound/               provider-adapter
  actions/                server actions per domän
supabase/
  migrations/
  seed.sql
```

## Design

Känsla: Linear / Attio / Superhuman. Snabbt, tyst, tangentbordsstyrt. Varje vy har ett jobb.

- **Mörkt först.** Bakgrund nära svart (slate-950-ton), ytor i två nivåer ovanpå, tunna 1px-kanter i stället för skuggor.
- **En accentfärg** (Optely-grön) reserverad för primära handlingar och "möte bokat". Statusfärger: grön = varm, blå = följ upp, gul = varning, röd = stopp.
- **Typografi**: Inter (eller Geist) för UI, monospace för siffror och tidsstämplar. Tabulära siffror i alla tabeller och KPI:er.
- **Täthet**: kompakta tabeller (32–36px rader), generöst luft runt sektioner.
- **Tangentbord**: ⌘K öppnar kommandopaletten överallt. Varje vy listar sina genvägar (visa med `?`). Ringpass och Gatekeeper ska gå att köra helt utan mus.
- **Tomma tillstånd** förklarar vad som saknas och erbjuder nästa handling – aldrig en tom tabell.
- **Laddning**: skeletons, aldrig spinners mitt i layouten.
- **Rörelse**: max 150–200 ms, bara för att visa orsak/verkan (en rad flyttas, en panel fälls ut).

## Språk & format

- Allt UI på **svenska** (finlandssvenska). Kod, variabelnamn och commits på engelska.
- Datum: `31.10.2026`, tid: `14:05`, tidszon `Europe/Helsinki`.
- Valuta: **euro**, format `1 250 €`.

## Byggordning

Grunden finns på alla sidor (riktig data, viktigaste knappar, mobil 390 px). Bygg sedan en sida eller kanal
i taget på djupet enligt `docs/saljsystem.md` ("bygg det som behövs för att ringa och mejla först").
Inga platshållarsidor.

## Definition of done (varje uppgift)

- `npm run build` och `npm run lint` utan fel, inga `any`.
- Fungerar på mobilbredd (ringpass ska gå att köra från telefonen).
- Tomma tillstånd och felhantering finns.
- Inga hemligheter i koden; nya env-variabler dokumenteras i `.env.example`.
