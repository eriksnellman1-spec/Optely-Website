# Optely Outreach Runtime (O.R.)

Optelys personliga sälj- och outreachsystem: kalla kontakter → varma samtal → bokade möten.
Läs `CLAUDE.md` för helheten (säljmodell, arkitektur och design).

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui, Supabase, n8n, Vercel.

> Appen ligger i undermappen `optely-outreach/` i webbplatsens repo. Kör alla kommandon nedan
> **i den här mappen**. På Vercel: skapa ett eget projekt med *Root Directory* = `optely-outreach`.

---

## 1. Förberedelser (en gång)

1. Skapa ett Supabase-projekt (region EU, t.ex. Frankfurt eller Stockholm).
2. **Authentication → Sign In / Providers → Email:** stäng av *Allow new users to sign up*.
3. **Authentication → Users → Add user:** skapa ditt eget konto (e-post + lösenord, markera *Auto Confirm*).
4. Installera beroenden:

   ```bash
   npm install
   ```

5. Kopiera miljövariablerna och fyll i värdena från *Project Settings → API*:

   ```bash
   cp .env.example .env.local
   ```

## 2. Databasen

Schemat ligger i `supabase/migrations/0001_init.sql`. Ändra aldrig tabeller från UI-koden – lägg till en ny
migration (`0002_…sql`) i stället.

```bash
npx supabase login                                    # en gång, öppnar webbläsaren
npm run db:link -- --project-ref <project-ref>        # frågar efter databaslösenordet
npm run db:push                                       # kör migrationerna
```

### Seed (testdata)

`supabase/seed.sql` innehåller påhittade bolag i Jakobstad, Larsmo, Pedersöre, Nykarleby och Vasa, kontakter,
en kampanj, mejl i olika status, svar (3 positiva → ringuppgifter skapas av triggern), samtal, möten,
partners och Företagshjärnans grundinnehåll. Skriptet tömmer affärstabellerna först och kan köras om.

```bash
npm run db:seed          # = supabase db push --include-seed
```

Alternativt: klistra in innehållet i Supabase *SQL Editor* och kör.

> ⚠️ Seeden raderar befintlig data i affärstabellerna. Kör den inte mot en databas med riktiga kunder.

### Typer

Efter varje ändring i schemat:

```bash
npm run db:types         # skriver lib/supabase/types.ts från det länkade projektet
```

## 3. Starta lokalt

```bash
npm run dev
```

Öppna http://localhost:3000 och logga in med kontot du skapade.

| Kommando            | Vad det gör                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Utvecklingsserver                        |
| `npm run build`     | Produktionsbygge                         |
| `npm run lint`      | ESLint                                   |
| `npm run typecheck` | TypeScript utan bygge                    |
| `npm run db:push`   | Kör nya migrationer mot länkat projekt   |
| `npm run db:seed`   | Migrationer + seed                       |
| `npm run db:types`  | Generera om `lib/supabase/types.ts`      |

## 4. Kortkommandon

| Tangent        | Funktion                                    |
| -------------- | ------------------------------------------- |
| `⌘K` / `Ctrl+K`| Kommandopalett: vyer, sök bolag/kontakter, snabbåtgärder |
| `?`            | Visa alla kortkommandon                     |
| `g` + bokstav  | Gå till vy: `h` Hem, `r` Ringpass, `o` Outreach, `k` Kontakter, `p` Partners, `s` Strategy, `b` Företagshjärnan, `i` Inställningar |
| `c`            | Ny kontakt                                  |
| `[`            | Fäll ihop / ut sidomenyn                    |
| `⌘S`           | Spara (Företagshjärnan)                     |
| `1`–`7`        | Utfall i Ringpasset                         |

## 5. Ringpasset och uppföljningssekvensen

Kalla bolag följer en sekvens på 8 steg. Ringdagar och mejldagar styrs av `settings.week_plan`:

| Steg | Kanal | Vad |
|---|---|---|
| 1 | mejl | Mejl 1 via AI Gatekeeper – sekvensen startar när det köas/skickas |
| 2 | samtal | Samtal 1 |
| 3 | samtal | Samtal 2 + röstmeddelande + "ringde nyss"-mejl |
| 4 | mejl | Case-mejl |
| 5 | samtal | Samtal 3 |
| 6 | samtal | Samtal 4 + röstmeddelande |
| 7 | mejl | Avslutsmejl |
| 8 | samtal | Sista samtalet → vilande 90 dagar, sedan tillbaka som `new` |

Mejlmallarna (`kind = 'template'`) redigeras i Företagshjärnan. Logiken ligger i databasen
(`apply_call_outcome`, `run_daily_sequence` i `0003_ringpass_sequence.sql`).

**Dagligt jobb:** `vercel.json` kör `GET /api/cron/sequence` kl. 04:15 UTC. Vercel skickar
`Authorization: Bearer $CRON_SECRET` – sätt `CRON_SECRET` i Vercel. Jobbet är idempotent och
loggas i `webhook_events` (`source = 'cron'`). Kör manuellt:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://optely-outreach.vercel.app/api/cron/sequence
```

**Ringpasset (`/ringpass`):** `j`/`k` byter samtal, `1`–`7` loggar utfall, `v` röstmeddelande,
`n` anteckning, `m` visar/döljer manus.

## 6. Webhooks från n8n

`POST /api/webhooks/n8n` med headern `x-optely-secret: <WEBHOOK_SECRET>` och JSON-kropp.
Händelsen loggas i `webhook_events`. Bearbetning byggs i steg 3.

```bash
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "content-type: application/json" \
  -H "x-optely-secret: $WEBHOOK_SECRET" \
  -d '{"type":"ping"}'
```

## Struktur

```
app/(auth)/login       inloggning
app/(app)/…            appskal + vyer
app/api/webhooks/n8n   n8n → appen
components/ui          shadcn + egna primitiver (StatusDot, Kbd, EmptyState, Stat, PageHeader)
components/shell       sidomeny, topbar, kommandopalett, dialoger
lib/supabase           server-, browser- och service-klienter + types.ts
lib/outbound           utskicksadapter (manual / smartlead / n8n-smtp)
lib/actions            server actions per domän
proxy.ts               skyddar allt utom /login och /api/webhooks/* (Next 16:s namn för middleware)
supabase/              config, migrationer och seed
```
