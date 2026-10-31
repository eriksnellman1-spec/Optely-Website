# ✈️ Optely Flight Agent

En privat, lokal flygprisagent. Den läser din kalender, hittar lediga helger,
långhelger och semestrar, hämtar priser direkt från flygbolaget och skickar
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

Appen startar med källan `demo` (påhittade priser) så att du kan testa allt
direkt. Byt till `ryanair` i sidopanelen eller i `config.yaml` för riktiga priser.

## Första testnotisen i telefonen

**Telegram**
1. Öppna @BotFather i Telegram → `/newbot` → kopiera token till `TELEGRAM_BOT_TOKEN` i `.env`.
2. Skriv "hej" till din nya bot.
3. `python -m flightagent.cli telegram-chatid` → klistra in `TELEGRAM_CHAT_ID=...` i `.env`.
4. `python -m flightagent.cli test-notify`

**Discord:** Serverinställningar → Integrationer → Webhooks → Ny webhook →
kopiera URL till `DISCORD_WEBHOOK_URL` → `python -m flightagent.cli test-notify`.

## Kalender

Lägg en eller flera iCal-länkar (kommaseparerade) i `CALENDAR_ICS_URLS`:
- **Google:** Inställningar → välj kalender → *Hemlig adress i iCal-format*.
- **iCloud:** Dela kalendern som offentlig → kopiera `webcal://`-länken.
- En lokal `.ics`-fil fungerar också.

Agenten hittar sammanhängande lediga block: helger, svenska röda dagar
(inklusive jul-, nyårs- och midsommarafton) och heldagshändelser som heter
t.ex. "Semester" eller "Ledig". Avresan är kvällen före ledigheten, tidigast
`after_work_hour`. Block med en upptagen händelse hoppas över. Händelser
markerade som "Ledig" i kalendern blockerar inte. Utan kalender används bara
helger och röda dagar.

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

- **Källor:** Just nu finns bara Ryanair som riktig källa. Den använder
  flygbolagets eget pris-API, samma som lågpriskalendern på ryanair.com. API:t
  är inofficiellt och kan ändras. Använd det sparsamt och för privat bruk.
  Nya flygbolag läggs till som en klass i `flightagent/providers/` med metoden
  `search_one_way`.
- **"Alltid billigast" kan ingen lova.** Agenten jämför bara de källor den har.
  Grundpriset från lågprisbolag är utan väska, och priset kan ändras innan du
  bokar.
- **Skrapning med webbläsare (Playwright)** av flygbolagssajter är bräckligt.
  Sajterna har bot-skydd, och skrapning bryter ofta mot deras villkor. Därför
  föredras flygbolagens egna JSON-endpoints där de finns.
- AI:ns förslag om tåg och andra flygplatser är idéer att kontrollera, inte
  bekräftade priser.

## Tester

```bash
python -m pytest -q
```
