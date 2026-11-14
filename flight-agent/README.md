# ✈️ Optely Flight Agent

En privat, lokal flygprisagent. Den hittar lediga helger och långhelger, hämtar priser direkt från flygbolaget och skickar
fynd till Telegram eller Discord. Inga konton och inga provisioner, och den
körs bara när du startar den.

## Kom igång (5 min)

```bash
cd flight-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
cp config.example.yaml config.yaml
streamlit run app.py
```

Utan nycklar söker appen bara Ryanair (gratis). Lägg till nycklarna nedan för
full täckning.

## Källor – så missar du inga fynd

| Källa | Täcker | Pris | Nyckel i `.env` |
|---|---|---|---|
| `google_flights` | Nästan alla flygbolag: SAS, Norwegian, Wizz Air, Lufthansa, KLM, Finnair, airBaltic, Vueling … Livepriser. | Gratis 250 sökningar/mån ([serpapi.com](https://serpapi.com)) | `SERPAPI_KEY` |
| `ryanair` | Ryanair, direkt från bolaget. Livepriser. | Gratis | – |
| `aviasales` | Hundratals bolag och resebyråer, även kombinationer. **Cachade** priser. | Gratis ([travelpayouts.com](https://www.travelpayouts.com)) | `TRAVELPAYOUTS_TOKEN` |
| `demo` | Påhittade priser för test | – | – |

Så samarbetar de för varje ledig period:
1. **Radar:** Ryanair och Aviasales söker "vart som helst". Google Explore ger
   tur-och-retur-priser till alla resmål med ett enda anrop.
2. **Kontroll:** för de 3 billigaste resmålen som ser ut som fynd hämtar
   Google Flights exakta avgångstider (`verify_top_n`). Det sparar
   SerpApi-sökningar.
3. **Hemresa:** söks i alla källor till alla hemmaflygplatser. Billigaste
   kombinationen vinner, även med olika bolag.

Resmål som Google hittade men som inte hann kontrolleras visas som
**"ca-pris"**, med en länk till Google Flights.

**SerpApi-budget:** appen håller koll och stannar vid
`serpapi_monthly_budget` (240). En sökning med 3 månader framåt använder ca
15–40 sökningar. `python -m flightagent.cli sources` visar förbrukningen.

Wizz Air, SAS och Norwegian har inga egna källor. Deras sajter blockerar
automatiska anrop, men alla tre finns med via Google Flights.

## Automatisk bevakning (Mac)

Låt Macen söka själv var 4:e timme och skicka nya fynd till telefonen:

```bash
python -m flightagent.cli install-schedule --hours 4
```

Samma fynd skickas bara en gång, eller igen om priset sjunker mer än 5 %.
Stäng av med `python -m flightagent.cli remove-schedule`. Macen måste vara
igång; missade körningar görs när den vaknar. Med 4 timmar och full
SerpApi-budget räcker gratisnivån inte hela månaden. Sänk då
`serpapi_max_per_run` till ca 8, eller kör var 12:e timme.

## Första testnotisen i telefonen

**Telegram**
1. Öppna @BotFather i Telegram → `/newbot` → kopiera token till `TELEGRAM_BOT_TOKEN` i `.env`.
2. Skriv "hej" till din nya bot.
3. `python -m flightagent.cli telegram-chatid` → klistra in `TELEGRAM_CHAT_ID=...` i `.env`.
4. `python -m flightagent.cli test-notify`

**Discord:** Serverinställningar → Integrationer → Webhooks → Ny webhook →
kopiera URL till `DISCORD_WEBHOOK_URL` → `python -m flightagent.cli test-notify`.

## Lediga perioder

Agenten söker resor till alla helger och svenska röda dagar, inklusive jul-,
nyårs- och midsommarafton. Avresan är kvällen före ledigheten, tidigast
`after_work_hour`.

## Hur sökningen fungerar

1. För varje resefönster och hemmaflygplats hämtas utresor (till dina
   destinationer eller vart som helst).
2. Avgångar före `earliest_departure_hour` och landningar efter
   `latest_arrival_hour` filtreras bort.
3. Hemresan söks över **alla** källor och **alla** hemmaflygplatser. Det
   billigaste väljs, även om det innebär olika flygbolag eller att du landar på
   en annan flygplats (då markeras det i resultatet).
4. Resor under `deal_threshold` räknas som fynd och kan skickas som notis.
5. Om du vill kan Claude sedan analysera topplistan: den väljer favoriter och
   föreslår alternativ som tåg sista biten eller närliggande flygplatser. Den
   varnar också för väskavgifter. Kostnaden är några ören per analys, och du
   behöver `ANTHROPIC_API_KEY`.

Kör sökningen från terminalen och skicka fynden:

```bash
python -m flightagent.cli scan
```

Lägg till `--dry-run` för att bara skriva ut resultatet.

## Ärligt om begränsningarna

- **Ryanairs pris-API** är inofficiellt och kan ändras. Använd det sparsamt.
- **Aviasales-priser är cachade.** De kan vara inaktuella, så kontrollera alltid
  innan du bokar. Resan märks med det.
- **"Alltid billigast" kan ingen lova.** Google Flights täcker nästan allt,
  men små bolag och resebyråers specialpriser kan saknas. Grundpriset från
  lågprisbolag är utan väska, och priset kan ändras innan du bokar.
- **Skrapning med webbläsare (Playwright)** av flygbolagssajter är bräckligt.
  Sajterna har bot-skydd, och skrapning bryter ofta mot deras villkor. Därför
  föredras flygbolagens egna JSON-endpoints där de finns.
- AI:ns förslag om tåg och andra flygplatser är idéer att kontrollera, inte
  bekräftade priser.

## Tester

```bash
python -m pytest -q
```
