# Optely Outreach Runtime (O.R.)

Ett personligt sälj- och outreach-system för Optely (AI- och automationsbyrå i Jakobstad).
En användare: Erik. Målet: kalla kontakter → varma samtal → bokade discovery-möten.

Den här filen är projektets bestående kontext. Läs den före varje uppgift.

## Säljmodellen (Warm Outbound)

1. Leads (svenskspråkiga B2B-bolag i Finland) importeras och berikas.
2. AI skriver en unik öppningsrad per bolag utifrån hemsidan. Erik godkänner i **AI Gatekeeper**.
3. Godkända mejl skickas från en separat outreach-domän via en **utbytbar utskicksleverantör**.
4. Positiva svar blir automatiskt ringuppgifter (databastrigger) → syns överst i **Ringpasset**.
5. Erik ringer varmt, bokar möte, loggar utfallet.

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
- **Webhooks från n8n**: varje route under `app/api/webhooks/*` ska (1) verifiera headern `x-optely-secret` mot `WEBHOOK_SECRET`, (2) logga rå payload i `webhook_events`, (3) bearbeta, (4) sätta `processed_at` eller `error`. Använd service role-klienten bara i dessa routes.
- **Säkerhet**: hela appen bakom inloggning (middleware). Publik signup är avstängd i Supabase. `SUPABASE_SERVICE_ROLE_KEY` får aldrig nå klienten.
- **Avregistrering respekteras alltid**: kontakter/bolag med `do_not_contact = true` får aldrig hamna i en utskicksbatch.

## Mappstruktur

```
app/
  (auth)/login/           inloggning
  (app)/layout.tsx        appskal: sidomeny, topbar, ⌘K
  (app)/page.tsx          Hem / War Room
  (app)/ringpass/
  (app)/outreach/         AI Gatekeeper + kampanjer
  (app)/contacts/         bolag & kontakter + tidslinje
  (app)/partners/
  (app)/strategy/         KPI:er, kalkylator, veckorapport
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

## Moduler & ordning

1. **Grund** – projekt, schema, auth, appskal, designsystem, seed *(steg 1)*
2. **Ringpasset + kontaktvy med tidslinje**
3. **AI Gatekeeper + outbound-adapter + webhooks (svar → ringlista)**
4. **Hem / War Room** – veckoplan, kalendersynk, tratt
5. **Partnernätverk**
6. **Strategy Room** – KPI:er, kalkylator, veckorapport
7. **Post-meeting-flöde**
8. **Låst modul 2027** (extern säljare, låses upp enligt `settings.external_caller_unlock`)

Bygg en modul i taget. Varje modul ska vara körbar och användbar innan nästa påbörjas.

## Definition of done (varje uppgift)

- `npm run build` och `npm run lint` utan fel, inga `any`.
- Fungerar på mobilbredd (ringpass ska gå att köra från telefonen).
- Tomma tillstånd och felhantering finns.
- Inga hemligheter i koden; nya env-variabler dokumenteras i `.env.example`.
