# Optelys säljsystem

Ett automatiserat flerkanals-säljsystem (outbound sales engine) med eget CRM, sekvensmotor och dashboard.

> Det här är projektets sanning för *vad* systemet ska göra. `CLAUDE.md` beskriver *hur* det byggs.
> Beslut som tagits under bygget står under "Beslut" längst ner.

## 1. Mål och målgrupp

- **Mål:** återkommande intäkt och ett valt huvuderbjudande.
- **Målgrupp:** svenskspråkiga småföretag med 2–15 anställda i hela Österbotten, där ägaren själv sköter
  administrationen. Tillverkning och tjänsteföretag först, bygg sist.
- **Budskap:** "vi hjälper med det som görs för hand vid sidan om jobbet", med Hagnäs Tyre Center som exempel
  (däcklistan skapas nu automatiskt).
- **Huvuderbjudande:** inte valt. Starkaste kandidat är automatiska listor och rapporter.

## 2. Globala regler

- Ett företag = en rad i databasen. Dubbletter känns igen på e-postdomän, telefonnummer eller företagsnamn.
- Svar i en kanal stoppar alla andra kanaler för det företaget.
- Nej eller Kontakta ej stoppar allt, permanent.
- Företag som hör till en partner kontaktas inte kallt.
- Befintliga kunder ligger utanför sekvenserna.
- Alla uppföljningar som inte kräver min röst eller mitt omdöme körs automatiskt, i mitt namn och min stil.
- Allt ska kunna kontrolleras och ses i appen.

## 3. Kanal 1: Kall e-post

Verktyg: Smartlead, flera separata domäner. Automatiskt utom svar.

| Steg | Dag | Handling | Typ |
|---|---|---|---|
| 1 | 0 | Företaget läggs in. Dubblettkontroll mot alla kanaler, partner och kunder | Automatiskt |
| 2 | 0 | AI läser hemsidan och skriver en personlig första mening | Automatiskt |
| 3 | 1 | Mejl 1 skickas. Status: I sekvens | Automatiskt |
| 4 | 2 | Företaget läggs i ringkön. Samtalet hänvisar till mejlet | Automatiskt |
| 5 | 3 | Mejl 2 skickas om inget svar | Automatiskt |
| 6 | – | Svar med intresse: status Svarat, alla sekvenser stoppas, notis till mig, jag bokar behovssamtal | Notis + manuellt |
| 7 | – | Nej eller avregistrering: status Kontakta ej i alla kanaler | Automatiskt |
| 8 | – | Inget svar efter mejl 2: fortsätter i samtalsprocessen | Automatiskt |

## 4. Kanal 2: Kalla samtal

Verktyg: ringapp kopplad till databasen. Samtalen manuella, resten automatiskt.
Ingångar: direkt från listan (företag utan e-post) eller från kall e-post dag 2.

| Steg | Handling | Typ |
|---|---|---|
| 1 | Företaget visas i idag-listan med VD, bransch, storlek och tidigare kontakter | Automatiskt |
| 2 | Jag ringer under ringpass och väljer utfall i appen | Manuellt |

| Utfall | Nästa steg | Typ |
|---|---|---|
| Bokat | Bekräftelse-SMS + kalenderhändelse. Status Behovssamtal bokat | Automatiskt |
| Ej svar, försök 1 | SMS nästa morgon. Nytt samtal schemaläggs annan dag och tid | Automatiskt |
| Ej svar, försök 2 | Nytt samtal schemaläggs annan dag och tid | Automatiskt |
| Ej svar, försök 3 | Sista mejl om e-post finns. Status Vilande 2 mån | Automatiskt |
| Ring senare | Samtal schemaläggs exakt vid angiven tid | Automatiskt |
| Fel person | Jag fyller i nytt namn och nummer. Nytt samtal schemaläggs | Manuellt + automatiskt |
| "Skicka info" | Kort mejl skickas. Påminnelse om LinkedIn-kontakt. Nytt samtal om 7 dagar | Automatiskt |
| Nej, inte nu | Samtal schemaläggs vid angiven tidpunkt | Automatiskt |
| Nej, inget behov | Status Nej | Manuellt |
| Ring ej | Status Kontakta ej i alla kanaler | Automatiskt |

## 5. Kanal 3: LinkedIn

Verktyg: LinkedIn + loggknapp i appen. DM manuella, uppföljning automatisk.
Ingångar: någon kommenterar ett inlägg, eller jag hittar en intressant kontakt i målgruppen.

| Steg | Dag | Handling | Typ |
|---|---|---|---|
| 1 | 0 | Dubblettkontroll mot alla kanaler | Automatiskt |
| 2 | 0 | Jag skickar DM med en fråga om deras situation och loggar det | Manuellt |
| 3 | – | Svar: status Svarat, jag föreslår 20 minuter, behovssamtal | Manuellt |
| 4 | 5 | Inget svar: påminnelse i idag-listan att skicka en uppföljning | Automatiskt |
| 5 | 10 | Fortfarande inget svar: företaget läggs i ringkön om telefon finns | Automatiskt |

## 6. Kanal 4: Partner

Verktyg: partnertabell i databasen + tipsformulär.
Partnertyper: bokföringsbyråer, IT-byråer, webb- och reklambyråer, återförsäljare av affärssystem.

| Steg | Dag | Handling | Typ |
|---|---|---|---|
| 1 | 1 | Mejl till partnern: vem jag är, Tyre Center, varför deras kunder, fråga om 20 min | Mall + manuellt |
| 2 | 3–4 | Samtal om inget svar visas i idag-listan | Automatiskt + manuellt |
| 3 | – | Partnermöte: vad frågar deras kunder om, tre signaler för när de ska tipsa, föreslå ett testfall | Manuellt |
| 4 | – | Testfall blir affär: villkor bekräftas per mejl (10–15 % provision eller underleverantör) | Manuellt |
| 5 | Varje månad | Uppdatering till partnern | Automatiskt |
| 6 | – | Tips via formulär: nytt företag med partnern som källa, status Hos partner, notis "ring idag" | Automatiskt |
| 7 | 0 | Jag ringer kunden samma dag och nämner partnern → behovssamtal | Manuellt |
| 8 | – | Partnern får besked om hur det gick | Automatiskt |

## 7. Från behovssamtal till kund (alla kanaler)

| Steg | Handling | Typ |
|---|---|---|
| 1 | Behovssamtal (20 min): frågor om vad som görs för hand, hur offerter hanteras, vad det kostar, vad de försökt | Manuellt |
| 2a | Enkelt problem → lösning och ungefärligt pris direkt → offert | Manuellt |
| 2b | Större problem → boka lösningsmöte | Manuellt |
| 2c | Inget problem → be om ett namn → status Nej | Manuellt |
| 3 | Lösningsmöte (30 min): lösning, pris, be om startdatum | Manuellt |
| 4 | Offert skickas samma dag. Status Offert skickad | Manuellt |
| 5 | Påminnelse dag 5 och dag 10 | Automatiskt |
| 6 | Inget svar → status Vilande 2 mån | Automatiskt |
| 7 | Ja → status Kund → leverans: bygg, testa, lämna över | Manuellt |
| 8 | Efter leverans: feedbackformulär, mät resultat, fråga "vem mer?" → nya företag in med kunden som källa | Automatiskt + manuellt |
| 9 | Vilande företag återaktiveras efter 2 mån och går in i sekvensen igen | Automatiskt |

## 8. Status per företag

Ny → I sekvens → Svarat → Behovssamtal bokat → Behovssamtal klart → Lösning visad → Offert skickad → Kund

Samt: Vilande, Nej, Kontakta ej, Hos partner

## 9. Teknik

| Del | Verktyg |
|---|---|
| Databas (CRM) | Supabase: företag, kontakter, affärer, partner |
| Automatik | n8n (självhostat) |
| Kall e-post | Smartlead |
| App och dashboard | Next.js |
| Kalender | Google Kalender |

## 10. Dashboard och analys

- **Dashboard:** veckans siffror mot mål (försök, svar, bokade, genomförda, offerter, kunder), siffror per kanal
  (försök → svar → bokade → kunder, bokade per timme av min tid), pipeline per status, idag-lista.
- **Varje lördag:** statistik från alla kanaler analyseras → siffror mot målen + max 3 konkreta ändringar, högst
  en per kanal.

Allt ska hänga ihop och fungera smidigt, också i dashboarden.

---

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

## Byggordning (faser)

| Fas | Innehåll |
|---|---|
| A | Datamodell 2.0: statusar enligt §8, dubblettkontroll, partnerägda bolag, kunder utanför sekvenser, "svar stoppar alla kanaler" |
| B | Ringpass 2.0: utfallen i §4, 3 försök med växlande tider, SMS-/kalenderkö, Skicka info + LinkedIn-påminnelse |
| C | Idag-lista: allt som ska göras i dag, alla kanaler |
| D | Kall e-post: Smartlead-adapter, AI-första mening, mejl 1 dag 1 → ringkö dag 2 → mejl 2 dag 3 |
| E | Svar via n8n: klassning, stopp av alla kanaler, notis |
| F | SMS-tjänst + Google Kalender |
| G | LinkedIn-kanalen |
| H | Partnerkanalen + tipsformulär |
| I | Behovssamtal → kund: affärer, offert, påminnelser dag 5/10, feedback, "vem mer?" |
| J | Dashboard mot veckomål + lördagsanalys |
