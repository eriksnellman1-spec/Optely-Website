# ✈️ Optely Flight Agent

En privat, lokal flygprisagent. Den söker tur-och-retur-resor alla dagar, hämtar priser direkt från flygbolaget och skickar
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

Så samarbetar de:
1. **Ryanair** hittar alla resmål och hämtar billigaste pris för varje dag åt
   båda hållen. Det kombineras till alla reslängder.
2. **Aviasales** ger cachade tur-och-retur-priser per månad (en biljett).
3. **Google Flights Explore** hittar billigaste datum per resmål och månad
   (helg- och veckoresor), inom den dagliga sökbudgeten.

Google-förslag visas som **"ca-pris"** utan exakta tider, med en länk till
Google Flights.

**SerpApi-budget:** gratisnivån räcker till ca 8 Google-sökningar per dag
(`serpapi_daily_budget`). Varje körning uppdaterar de månader som kollades
längst sedan. Övriga månader visar sparade Google-priser (högst
`explore_cache_days` gamla), märkta med datum. Ryanair och Aviasales söker
alltid alla datum. `python -m flightagent.cli sources` visar
förbrukningen. Med ett betalt SerpApi-konto höjer du bara budgetarna.

Wizz Air, SAS och Norwegian har inga egna källor. Deras sajter blockerar
automatiska anrop, men alla tre finns med via Google Flights.

## Automatisk bevakning (Mac)

Låt Macen söka själv var 4:e timme och skicka nya fynd till telefonen:

```bash
python -m flightagent.cli install-schedule --hours 4
```

Samma fynd skickas bara en gång, eller igen om priset sjunker mer än 5 %.
Stäng av med `python -m flightagent.cli remove-schedule`. Macen måste vara
igång; missade körningar görs när den vaknar. Google-budgeten fördelas
automatiskt per dag, så du kan köra så ofta du vill.

## Första testnotisen i telefonen

**Telegram**
1. Öppna @BotFather i Telegram → `/newbot` → kopiera token till `TELEGRAM_BOT_TOKEN` i `.env`.
2. Skriv "hej" till din nya bot.
3. `python -m flightagent.cli telegram-chatid` → klistra in `TELEGRAM_CHAT_ID=...` i `.env`.
4. `python -m flightagent.cli test-notify`

**Discord:** Serverinställningar → Integrationer → Webhooks → Ny webhook →
kopiera URL till `DISCORD_WEBHOOK_URL` → `python -m flightagent.cli test-notify`.

## Vart vill du?

Skriv fritt i appens fält **"Vart vill du?"**, eller i `where:` i
`config.yaml`, så söker alla källor just dit. Några exempel:
- `varmt i Spanien`
- `Barcelona eller Lissabon`
- `grekiska öarna`
- `storstad i Italien`

Claude tolkar beskrivningen till flygplatser, även mindre som
lågprisbolagen använder (t.ex. Girona för Barcelona). Du ser i appen exakt
vilka flygplatser som söks. Samma beskrivning kostar bara en gång, eftersom
svaret sparas. Det kräver `ANTHROPIC_API_KEY`. Utan nyckel kan du skriva
flygplatskoder direkt, t.ex. `BCN, AGP, PMI`. Lämnar du fältet tomt söker
appen vart som helst.

Från terminalen:

```bash
python -m flightagent.cli scan --where "varmt i Spanien"
```

## Vilka datum söks?

Alla dagar de närmaste `months_ahead` månaderna, även mitt i veckan.
Resorna är tur och retur på `min_nights`–`max_nights` nätter (standard 1–7).
Varje förslag visar hur många lediga dagar du behöver ta, t.ex. "Helg",
"Långhelg (Juldagen)" eller "2 lediga dagar behövs". Svenska röda dagar
räknas, inklusive jul-, nyårs- och midsommarafton. Högst `per_destination`
datum visas per resmål (standard 3), så att listan inte fylls av samma stad.

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
