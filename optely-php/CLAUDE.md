# Optely O.R. – PHP

Personlig säljapp för Erik (Optely, Jakobstad). Ren PHP 8 + MySQL på Hostinger. Ingen ramverk, ingen byggprocess.

## Arbetsregel
- **En kanal i taget, färdig på riktigt, innan nästa.** Klart: Samtal + Kunder. Inget annat läggs till utan att Erik bett om det.
- Håll det enkelt. Hellre färre funktioner som fungerar än många.
- Fråga med flerval innan du bygger när något är oklart. Förklara steg för Erik ett i taget.

## Design
- Vit och lugn: vit yta, ljusgrå bakgrund, tunna kanter, en accentfärg (grön) för primära knappar och bokade möten.
- Systemtypsnitt, 15 px. Fungerar på mobil (390 px) utan sidoscroll.
- Allt UI på svenska (finlandssvenska). Datum `28.11.2026`, tid `14:05`, euro `1 500 €`. Tidszon Europe/Helsinki.

## Kod
- `app/bootstrap.php`: config, PDO (`q()`), session, CSRF (`check_post()`), hjälpare. `app/layout.php`: sidhuvud/fot. `app/calls.php`: ringlogik.
- Alla POST går via `check_post()`. All utdata via `e()`. Endast förberedda frågor.
- Tider räknas i PHP (`now()`, `today()`), aldrig `NOW()` i SQL.
- Schemaändringar: uppdatera `schema.sql` och skriv en `ALTER`-fil i `migrations/` när databasen redan är i bruk.
- `config.php` checkas aldrig in.
