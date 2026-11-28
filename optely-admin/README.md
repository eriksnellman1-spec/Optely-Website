# Optely Admin (PHP)

Optelys interna admin för **ekonomi, fakturor och investeringar**, byggd i vanlig PHP 8 med MySQL. Det finns ingen
byggprocess och inga beroenden att installera: ladda upp mappen till ett webbhotell så fungerar det.

Ekonomi- och investeringsdelarna är flyttade från Lovable-appen
[optely-insight-hub](https://github.com/eriksnellman1-spec/optely-insight-hub) och räknar på samma sätt.
Leads och CRM ligger kvar i `optely-outreach/`.

| Sida | Innehåll |
|---|---|
| **Ekonomi** (`index.php`) | Omsättning, MRR/ARR, resultat och marginal, kunder, kumulativa siffror, hittills i år, timpris, intäkt per kund, fyra grafer och månadshistorik med avstämning mot betalda fakturor |
| **Fakturor** (`fakturor.php`) | Obetalt, förfallet, betalt, utkast och snittid till betalning. Snabbknappar för Skickad och Betald, filter, och fakturerat per kund |
| **Investeringar** (`investeringar.php`) | Värde, insatt kapital, avkastning, CAGR, prognos, bästa och sämsta innehav, fördelning, portföljvärde över tid, och uppdatering av alla värden i ett steg |
| **Integrationer** (`integrationer.php`) | API-nyckel och exempel, Stripe-webhook, import från Lovable, händelselogg, export och rensning |

## Installation på webbhotell

1. **Skapa en MySQL-databas** i webbhotellets kontrollpanel och importera `sql/schema.sql`, till exempel via phpMyAdmin → Importera.
2. **Ladda upp mappen** `optely-admin/` via FTP eller Git, till exempel till `admin.optely.fi/` eller `optely.fi/admin/`.
3. **Kopiera** `app/config.example.php` till `app/config.php` och fyll i databasuppgifterna.
4. **Öppna sidan i webbläsaren.** Första gången får du välja ett lösenord. Sidan visar då en hash som du klistrar in som
   `admin_password_hash` i `app/config.php`.
5. **Importera din data från Lovable** under *Integrationer → Importera från Lovable*. Stegen står på sidan.

Krav: PHP 8.1 eller senare med `pdo_mysql`, och MySQL 5.7+ eller MariaDB 10.3+. Kör alltid över **HTTPS**.

### Säkerhet

- `.htaccess` stänger av åtkomst till `app/` och `sql/` på Apache, vilket de flesta webbhotell kör.
  Kör ditt webbhotell **nginx** behöver du blockera de mapparna i serverns konfiguration.
- Inloggningen låses i 15 minuter efter 5 felaktiga försök från samma IP-adress.
- Alla formulär har CSRF-skydd och alla SQL-frågor använder prepared statements.
- Sidorna har `noindex`, så sökmotorer indexerar dem inte.

## Automationer

### API (`api.php`)

Skicka `Authorization: Bearer <api_token>` i headern. Nyckeln sätter du i `app/config.php`.

```bash
# Alla nyckeltal, t.ex. till en veckorapport från n8n
curl -H "Authorization: Bearer $TOKEN" "https://admin.optely.fi/api.php?action=metrics"

# Lägg till en kostnad på innevarande månad
curl -X POST https://admin.optely.fi/api.php -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"month.add","costs":29,"note":"Ny prenumeration: Make"}'
```

| Åtgärd | Vad den gör |
|---|---|
| `GET ?action=metrics[&month=ÅÅÅÅ-MM]` | Nyckeltal för ekonomi, fakturor och investeringar |
| `GET ?action=months` · `invoices` · `holdings` | Rådata |
| `month.set` | Sätter fält för en månad (bara de fält som skickas) |
| `month.add` | Lägger till på befintliga värden |
| `invoice.upsert` | Skapar eller uppdaterar en faktura (matchas på `external_id`, sedan `number`) |
| `invoice.status` | Byter status, t.ex. till `Betald` |
| `holding.value` | Uppdaterar ett innehavs värde |
| `portfolio.log` | Sparar månadens portföljvärde |

Allt som kommer in loggas och syns under *Integrationer → Händelselogg*.

### Stripe (`stripe-webhook.php`)

Webhooken tar emot `invoice.finalized`, `invoice.paid`, `invoice.voided`, `invoice.marked_uncollectible` och
`checkout.session.completed`. Signaturen verifieras, och samma händelse räknas aldrig två gånger. Med
`stripe_add_to_month = true` läggs betalningar också på månadens omsättning: prenumerationer som MRR, övrigt som engångsintäkt.

## Lokal utveckling

```bash
cp app/config.example.php app/config.php   # fyll i databasuppgifter
php -S 127.0.0.1:8090 -t .
```
