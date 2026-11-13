# Optelys säljsystem (Optely + SBA)

> **Källa:** CONTEXT från Erik (2026-11-07). Den här filen är projektets sanning för *vad* som ska byggas.
> `CLAUDE.md` beskriver *hur*. Vid krock gäller CONTEXT. Beslut under bygget står längst ner.

## Syfte

En egen app för all kall outreach för två erbjudanden, **Optely** och **SBA**, med en gemensam databas,
ringlista och dashboard. Erik jobbar ensam och ringer själv. Allt ska vara kopplat och så automatiserat som
möjligt. Språk i appen: svenska.

## Erbjudanden

1. **Optely** – AI-automation av administration (listor/rapporter, offerter + uppföljning, kundkort).
   Målgrupp: svenskspråkiga företag i Österbotten, alla branscher utom bygg, tillverkning först.
2. **SBA** – färdigt system för fler bokade kunder åt hantverkare och installatörer (bygg, VVS, el, måleri, tak).
   Löfte: minst 3 extra bokade möten/offerttider/besök per månad, räknas när bokat. Färre än 3 = ingen avgift den
   månaden. Pris 490 €/mån fast, kunden betalar själv annonsbudgeten. Leveransen sker i GoHighLevel, inte i appen.

**Regel:** ett företag kan bara ha ett aktivt erbjudande. Bygg = SBA, övriga = Optely.
(I appen: `companies.offer`. Byte spärras när bolaget är i sekvens eller längre fram, utom vid Ny, Nej, Vilande
och Kontakta ej.)

## Stack

- Frontend: webbapp (fungerar även i mobilens webbläsare)
- Databas: Supabase
- Automatik: n8n
- Kall e-post: Smartlead (5 inkorgar: 3 på optely-team.com, 2 på getoptely.com, Hostinger). Hälften av volymen
  till respektive erbjudande.
- LinkedIn: DM görs manuellt, loggas i appen
- Samtal: nu `tel:`-länkar (ringer från Android-telefonen med appen öppen i mobilen). Senare Twilio Voice JS SDK
  i webbläsaren med Eriks verifierade mobilnummer som avsändare.

## Datamodell (Supabase)

| Tabell | Innehåll | I appen |
|---|---|---|
| companies | namn, kommun, postort, bransch, anställda, omsättning, telefon, VD, webb, erbjudande, status, källa, anteckning | `companies` (+ `offer`) |
| contacts | företag, namn, roll, telefon, e-post, linkedin | `contacts` |
| activities | företag, kontakt, kanal (samtal/e-post/linkedin/partner), typ, utfall, tidpunkt, varaktighet, erbjudande | vyn `activities` (samlar calls, emails, replies, sms_messages, linkedin_messages, partner_checkins, meetings) |
| deals | företag, erbjudande, steg, värde, nästa åtgärd, datum för nästa åtgärd | `deals` (steg synkas från status) |
| partners | typ (bokföring/IT/reklam-webb), namn, kontakt, status, svar, nästa åtgärd | `partners` |
| sba_clients | företag, bokningar denna månad (från GoHighLevel), garantin uppnådd, fakturera | `sba_clients` (bokningar manuellt tills GoHighLevel kopplas) |

Dessutom: `customers_optely` (projekt, fakturerad, driftsavtal), `linkedin_messages` (manuell loggning),
`weekly_reviews` (Lördagsanalysens "vad ska ändras"), vyn `offer_stats_weekly` (veckosiffror per erbjudande och kanal).

Underlag: CSV med 1 176 aktiva bolag (PRH + Profinder), ringlista med 189 bolag (2–15 anställda),
partnerlista med 109 byråer.

## Sidor

Växel högst upp: **Alla / Optely / SBA** – styr all data på alla sidor (sparas i URL `?offer=` och cookie).

1. **Översikt** (`/`) – kontaktade, svar, bokade möten, avtal per erbjudande sida vid sida. Bokade möten per 100
   kontaktade per erbjudande och kanal.
2. **Idag** (`/ringpass`) – dagens samtalslista: varma först (svarat/öppnat mejl flera gånger), sedan kalla.
   Etikett för erbjudande + rätt manus per rad. Dagens uppföljningar.
3. **Företag** (`/contacts`) – hela registret med filter, kontaktkort med all historik över kanaler, spärr för
   dubbla erbjudanden.
4. **Pipeline** (`/pipeline`) – Kontaktad → Svar → Möte bokat → Möte hållet → Offert → Kund. Filter per erbjudande.
5. **Kunder** (`/customers`) – Optely: projekt, faktura, eventuellt driftsavtal. SBA: bokningar mot garantin
   (3/mån), fakturera ja/nej.
6. **Manus och sekvenser** (`/scripts`) – flikarna Optely och SBA: samtalsmanus, invändningar, e-postsekvenser.
7. **Partner** (`/partners`) – endast Optely.
8. **Lördagsanalys** (`/strategy`) – veckans siffror per erbjudande och kanal + vad som ska ändras.

Under "Mer": Outreach (`/outreach`, mejl per status), Företagshjärnan (`/brain`), Inställningar (`/settings`).

## Ring-knappen

Ett klick: (1) startar samtalet via `tel:`-länk (senare Twilio), (2) loggar försöket med tid i activities,
(3) öppnar en ruta för utfall: inget svar / svar – nej / ring senare (datum) / möte bokat (tid) / fel person.
Utfallet uppdaterar status, deal och nästa åtgärd automatiskt.

> **Nuvarande läge (2026-11-13):** Ring-knappen är en `tel:`-länk utan timer. Försöket loggas när utfallet
> väljs i rutan för företaget. Fem stora utfall (Inget svar, Svar – nej, Ring senare, Möte bokat, Fel person,
> tangent 1–5) och tre under Mer (Skicka info, Nej inte nu, Ring ej, 6–8). Kortet visar nästa steg per utfall
> och ett eget fält för nästa åtgärd som sparas på affären.

## Automatik (n8n)

- Smartlead → Supabase: skickat, öppnat, svar och avregistrering loggas i activities
- Positivt svar eller flera öppningar → företaget läggs automatiskt i dagens samtalslista
- Flerkanalsuppföljning, upp till 5–7 kontakter per företag (e-post → samtal → LinkedIn → e-post …), nästa steg
  skapas automatiskt efter varje utfall
- Avregistrerade och "nej tack" spärras i alla kanaler
- GoHighLevel → sba_clients: antal bokningar per kund och månad
- Lördag: sammanställning av veckans statistik till sidan Lördagsanalys

## Regler

- Inga fasta datum, milstolpar eller stoppregler i appen. Bara mätning.
- Inga dokument, inga Meta-annonser.
- Håll det enkelt: bygg det som behövs för att ringa och mejla först, resten efter.

---

## Kvar från tidigare spec (gäller tills det byggs om)

Det här finns i appen sedan fas A–C och ändras inte förrän en egen omgång:

- **Statusar:** Ny → I sekvens → Svarat → Behovssamtal bokat → Behovssamtal klart → Lösning visad →
  Offert skickad → Kund, samt Vilande, Nej, Kontakta ej, Hos partner. Deal-stegen härleds från dessa.
- **Globala regler:** ett företag = en rad; dubbletter (e-postdomän, telefon, namn) stoppas och visas; svar i en
  kanal stoppar alla andra; Nej/Kontakta ej stoppar allt permanent; partnerägda bolag kontaktas inte kallt;
  kunder ligger utanför sekvenserna.
- **Samtalskanalen (Ringpasset):** 15 nya bolag per ringdag; 3 försök på ringdagar med växlande fm/em;
  SMS efter försök 1; sista mejl + Vilande 2 mån efter försök 3; utfallen Bokat, Ej svar, Ring senare,
  Fel person, Skicka info, Nej inte nu, Nej inget behov, Ring ej.

## Krockar mellan CONTEXT och tidigare spec

| # | Tidigare spec | CONTEXT (gäller) | Hur det hanteras nu |
|---|---|---|---|
| 1 | Ett erbjudande, målgrupp 2–15 anställda, bygg sist | Två erbjudanden: bygg/VVS/el/måleri/tak = SBA, övriga = Optely | `companies.offer`. Ringpassets "bygg sist" i kön finns kvar tills ringlogiken görs om. |
| 2 | 8 utfall, försöket loggas när utfallet väljs | Ring-knapp med 5 utfall, försöket loggas vid klick | Oförändrat i denna omgång (ringlogiken rörs inte). |
| 3 | Samtal: 3 försök, sedan Vilande 2 mån | Flerkanal 5–7 kontakter via n8n | Oförändrat tills n8n kopplas. |
| 4 | Dashboard "mot veckomål", lördag max 3 ändringar | Inga mål, bara mätning; lördag "vad ska ändras" | Översikt och Lördagsanalys visar bara siffror; fritext för ändringar. |
| 5 | Idag-lista på Hem (fas C) | Översikt på `/`, Idag = samtalslistan | Fas C:s delar ligger överst på Idag (`/ringpass`). |
| 6 | Partnertyper inkl. affärssystem | Bokföring, IT, reklam-webb | Befintlig typ "övrigt/affärssystem" finns kvar i databasen. |
| 7 | Google Kalender, SMS-tjänst (fas F) | Inte nämnt; Twilio för samtal senare; GoHighLevel för SBA | Inga integrationer nu; tabeller och fält finns för senare. |
| 8 | Offert/behovssamtal-flöde §7 med påminnelser | "Inga dokument" | Inga dokument skapas; deals har bara steg, värde och nästa åtgärd. |
| 9 | Idag: positiva svar först | Varma först (svarat/öppnat mejl flera gånger) | Öppningar kommer först med Smartlead/n8n; svar ligger redan först. |

## Beslut under bygget

| Datum | Fråga | Beslut |
|---|---|---|
| 2026-11-02 | Godkänns AI-meningen innan mejl skickas? | Ja i början (Gatekeeper). Helautomatik slås på med en inställning när tonen sitter. |
| 2026-11-02 | SMS och kalender innan fas F (SMS-tjänst/Google Kalender) | Köas och visas i appen med färdig text; skickas/läggs in för hand tills vidare. |
| 2026-11-02 | "Annan dag och tid" för nytt försök | Nästa ringdag enligt veckoplanen, växla förmiddag/eftermiddag. |
| 2026-11-02 | "Nej, inget behov" | Bara status Nej (inget fält för annan person). |
| 2026-11-02 | Dubblett hittas | Stoppa och visa matchen; "lägg till ändå" går att välja. |
| 2026-11-02 | Ingång till ringkön innan Smartlead (fas D) | Alla nya företag går direkt till ringkön. |
| 2026-11-02 | Nya företag per ringdag | 15 (ändras i `settings.ringpass.new_per_day`). Återuppringningar och svar räknas inte. |
| 2026-11-02 | "Fel person" | Nytt samtal direkt, samma dag, överst i kön. |
| 2026-11-02 | "Nej, inte nu" | Status Vilande till valt datum; samtalet ligger färdigt då. |
| 2026-11-02 | Bekräftelse vid "Bokat" | SMS om mobilnummer finns, annars mejl. |
| 2026-11-02 | "Skicka info" | Mallen öppnas i dialogen och skrivs/justeras för hand varje gång. |
| 2026-11-02 | Var ligger idag-listan? (fas C) | På Hem. Ringpasset finns kvar som läge för att ringa ("Starta ringpass"). |
| 2026-11-02 | Vad visar idag-listan? | Svar och partnertips, dagens/morgondagens möten, ringpass (antal + nästa), Att göra för hand, partner som behöver höras. |
| 2026-11-02 | Notiser vid svar och tips | Bara i appen: siffra vid Hem (obehandlade) + toast när något kommer in medan appen är öppen. |
| 2026-11-02 | Ordning i idag-listan | Efter typ: svar/tips → möten → ringpass → att göra → partner. |
| 2026-11-02 | Möten i idag-listan | Enkla knappar: Genomfört (→ Behovssamtal klart), Dök inte upp (→ nytt samtal först i kön). Resten i fas I. |
| 2026-11-02 | När ska en partner höras? | När senaste check-in är äldre än partnerns intervall (standard 30 dagar) eller aldrig skett. |
| 2026-11-07 | Fas C (PR #31, ej mergad) | Följer med i grund-PR:en. Idag-listans delar ligger överst på Idag (/ringpass); / blir Översikt. |
| 2026-11-07 | "Svar" i samtalskanalen | Någon svarade i telefon: alla utfall utom Ej svar och Röstmeddelande (även nej). E-post: inkomna svar. LinkedIn: inkommande meddelanden. |
| 2026-11-07 | Vilken kanal får ett bokat möte? | Kanalen som bokade det: bokat i samtal → samtal, annars kanalen för senaste utgående kontakt före bokningen. |
| 2026-11-07 | Vad är ett "avtal"? | Bolag vars affär nådde steget Kund den veckan (Optely och SBA). |
| 2026-11-13 | Utfall i Ringpasset | 5 stora (Inget svar, Svar – nej, Ring senare, Möte bokat, Fel person) + 3 under Mer (Skicka info, Nej inte nu, Ring ej). |
| 2026-11-13 | Ring-knappen | Bara `tel:`-länk; ingen timer och ingen loggning vid klick. Försöket loggas med utfallet. |
| 2026-11-13 | "Svar – nej" | Status Nej (befintligt utfall `no_need`); alla kanaler stoppas. |
| 2026-11-13 | Nästa steg i kortet | Visas per utfall; eget fält för nästa åtgärd + datum sparas på bolagets öppna affär (syns i Pipeline). |
| 2026-11-13 | Ringlistan | CSV-import i appen (Företag → Importera CSV) med kolumnval, gissning av PRH/Profinder-rubriker, dubblettkontroll och erbjudande utifrån bransch. Nya bolag får status Ny. |
| 2026-11-13 | Extra i passet | Redigera kontakt i kortet (`e`), dagens siffror (ringda/svar/bokade/kvar), hoppa över (`s`) och skjut upp till nästa ringdag (`u`). |
| 2026-11-13 | Testdata | Knappen "Töm testdata" tar bort bolag och partner med .test-adresser. Manus, mallar och inställningar behålls. |

## Implementationsnoter

- `weekly_reviews` har en rad per vecka **och** erbjudande (null = alla), så att Optely och SBA kan få egna
  anteckningar. Unikt på (vecka, erbjudande).
- Värde på SBA-affärer sätts till 490 € (månadsavgift) som standard; Optely-affärer har inget standardvärde.
