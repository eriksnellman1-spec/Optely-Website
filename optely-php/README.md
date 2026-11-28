# Optely O.R. – PHP

Enkel säljapp i ren PHP + MySQL för Hostinger. Byggs en kanal i taget.

**Klart nu:** Samtal (Idag, Företag med CSV-import) och Kunder.

## Sidor

| Sida | Vad |
|---|---|
| `idag.php` | Ringkön, kontaktkort, utfall (1–5), möten att följa upp, dagens siffror |
| `foretag.php` | Alla bolag: sök, statusfilter, nytt/redigera, Ring nu, radera ett/markerade/alla |
| `import.php` | CSV-import med kolumnval, dubblettkontroll och förhandsvisning |
| `kunder.php` | Kunder: projekt, engång, per månad, fakturerat, driftsavtal, aktiv |

## Samtal – regler

- Importerade bolag får status **Ny**. Varje vardag släpps `new_per_day` (15) in i kön. **Hämta 5 till** släpper in fler direkt.
- **1 Inget svar** – nytt försök nästa vardag 09:00. Efter `max_attempts` (4) → status *Inget svar*.
- **2 Svar – nej** – status *Nej*.
- **3 Ring senare** – välj dag och tid.
- **4 Möte bokat** – välj dag och tid. När mötet har passerat: *Blev kund* (→ Kunder), *Ingen affär* eller *Ring upp*.
- **5 Fel person** – skriv rätt person (och telefon); bolaget läggs först i kön igen.
- *Ring ej* – ringer aldrig mer.
- Tangenter på Idag: `1`–`5`, `n` = anteckning.

## Installera på Hostinger (en gång)

1. **Databas:** hPanel → *Databaser → MySQL-databaser* → skapa databas + användare. Notera namn, användare och lösenord.
2. **Tabeller:** hPanel → *phpMyAdmin* → välj databasen → *Importera* → `schema.sql`.
3. **Filer:** ladda upp innehållet i den här mappen till `public_html` (eller en undermapp/subdomän) med *Filhanteraren*.
4. **Konfig:** kopiera `config.sample.php` till `config.php` och fyll i databasuppgifterna, din e-post och `password_hash`.
   Lösenordshash: kör `php -r "echo password_hash('ditt-lösenord', PASSWORD_DEFAULT), PHP_EOL;"` lokalt.
5. Öppna sidan och logga in.

`.htaccess` stänger ute `config.php`, `schema.sql` och mappen `app/`. Kräver PHP 8.1+ (Hostinger: *Avancerat → PHP-konfiguration*).

## Lokalt

```bash
php -S 127.0.0.1:8088
```
