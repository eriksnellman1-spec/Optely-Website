# Bokningschatboten – installation

Chatboten (`src/components/ChatWidget.tsx`, `src/app/api/chat/route.ts`) svarar på frågor utifrån hemsidans innehåll och bokar 15 minuters Google Meet-möten direkt i Google Kalender (alla dagar 06–22 finsk tid, med 15 minuters marginal runt andra händelser och spärrad lunch 10:50–11:45 på vardagar). Den syns på sidan först när alla nycklar nedan är inlagda i Vercel.

## 1. Anthropic API-nyckel

1. Gå till https://console.anthropic.com och logga in eller skapa ett konto.
2. **Billing**: lägg in ett betalkort och gärna en **månadsgräns** (t.ex. 20 €), så att kostnaden aldrig kan skena.
3. **API Keys → Create Key**, döp den till `optely-website` och kopiera nyckeln (`sk-ant-...`). Den visas bara en gång.

## 2. Google Kalender

Använd det Google-konto vars kalender mötena ska hamna i.

1. Gå till https://console.cloud.google.com och skapa ett nytt projekt, t.ex. `Optely chatbot`.
2. **APIs & Services → Library**: sök på **Google Calendar API** och klicka **Enable**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type: **External**. App name: `Optely chatbot`, din e-post som support- och kontaktadress.
   - Lägg till dig själv under **Test users**.
   - **Viktigt:** klicka sedan **Publish app** (status "In production"). Annars slutar nyckeln fungera efter 7 dagar. Du behöver inte skicka appen för granskning; varningen "unverified app" visas bara för dig när du godkänner i steg 3 nedan.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
   - Kopiera **Client ID** och **Client secret**.

### Hämta en refresh token

1. Öppna https://developers.google.com/oauthplayground
2. Klicka på kugghjulet uppe till höger → kryssa i **Use your own OAuth credentials** → klistra in Client ID och Client secret.
3. I rutan "Input your own scopes" till vänster, klistra in:
   ```
   https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.calendarlist.readonly
   ```
   och klicka **Authorize APIs**. Logga in med kalenderkontot och godkänn (klicka "Advanced → Go to Optely chatbot" om Google varnar).
4. Klicka **Exchange authorization code for tokens** och kopiera **Refresh token**.

## 3. Lägg in nycklarna i Vercel

I Vercel-projektet som har domänen optely.eu: **Settings → Environment Variables**, lägg till för **Production** (och gärna Preview):

| Namn | Värde |
|---|---|
| `ANTHROPIC_API_KEY` | nyckeln från steg 1 |
| `GOOGLE_CLIENT_ID` | Client ID från steg 2 |
| `GOOGLE_CLIENT_SECRET` | Client secret från steg 2 |
| `GOOGLE_REFRESH_TOKEN` | refresh token från steg 2 |
| `GOOGLE_CALENDAR_ID` | valfri – lämna tom för huvudkalendern |
| `GOOGLE_BUSY_CALENDAR_IDS` | valfri – behövs normalt inte. Boten räknar automatiskt med alla kalendrar som är ikryssade i Google Kalender (t.ex. importerade skolscheman), förutsatt att refresh token har behörigheten `calendar.calendarlist.readonly`. Här kan du lägga till extra kalender-ID:n, separerade med komma. |
| `NEXT_PUBLIC_CHATBOT_ENABLED` | `true` |

Gör sedan en ny deploy: **Deployments → senaste → ⋯ → Redeploy**.

## 4. Testa

Öppna optely.eu, klicka på chattbubblan nere till höger och boka ett möte med din egen e-post. Mötet ska dyka upp i kalendern med en Google Meet-länk, och inbjudan ska komma till e-posten.

## Att veta

- **Vad som blockerar en bokning:**
  - Alla händelser med klockslag i *andra* ikryssade kalendrar, t.ex. importerade Wilma-scheman (nya importer räknas automatiskt inom 10 minuter). Kryssa ur en kalender i Google Kalender för att den inte ska påverka.
  - I huvudkalendern bara möten med andra personer (händelser med gäster, inklusive de möten boten bokar) och arbetspass vars titel slutar på "work" (t.ex. "Work", "Safercuts work" – men inte "Deep work"). Regeln finns i `WORK_TITLE` i `src/lib/chatbot/calendar.ts`.
  - Allt annat i huvudkalendern (gym, ringpass, påminnelser), alla heldagshändelser och händelser markerade som "Ledig" blockerar inte.
  - Lunch 10:50–11:45 på vardagar, och 15 minuters marginal runt allt som blockerar. Mötena skapas alltid i huvudkalendern.

- **Kostnad:** varje meddelande kostar en liten summa hos Anthropic (modellen `claude-opus-5-5`). Följ förbrukningen under Usage i Anthropic Console.
- **Stänga av:** sätt `NEXT_PUBLIC_CHATBOT_ENABLED` till `false` och gör en ny deploy.
- **Missbruksskydd:** högst 30 meddelanden per 10 minuter och 3 bokningar per dygn per besökare (enkel spärr, nollställs när servern startar om).
- **Kunskap:** boten vet bara det som står på hemsidan (tjänstesidor, kundcase, vanliga frågor). Ändras hemsidan ändras boten automatiskt.
- **GDPR:** namn, e-post och övriga uppgifter används bara för mötesinbjudan och sparas i kalendern. Konversationerna skickas till Anthropic för att generera svaren. Nämn detta i en integritetspolicy om du har eller skapar en.
