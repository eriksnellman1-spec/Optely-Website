<?php
// Kopiera den här filen till app/config.php och fyll i dina värden.
// app/config.php checkas aldrig in i git.

return [
    // MySQL-uppgifter från ditt webbhotell
    'db_host'    => 'localhost',
    'db_name'    => 'optely_admin',
    'db_user'    => 'optely',
    'db_pass'    => '',
    'db_charset' => 'utf8mb4',

    // Lösenordets hash. Lämna tomt första gången: inloggningssidan hjälper
    // dig då att skapa en hash som du klistrar in här.
    'admin_password_hash' => '',

    // Nyckel för api.php (n8n, Make, Zapier, egna skript). Minst 32 tecken.
    // Skapa en med t.ex.: php -r "echo bin2hex(random_bytes(24));"
    'api_token' => '',

    // Signeringsnyckel för Stripe-webhooken (whsec_...). Lämna tomt om du inte använder Stripe.
    'stripe_webhook_secret' => '',

    // true = betalda Stripe-fakturor läggs automatiskt på månadens omsättning
    // (prenumerationer som MRR, övrigt som engångsintäkt). false = bara fakturalistan uppdateras.
    'stripe_add_to_month' => false,

    // Optelys startmånad (används för tomma lägen och månadsväljaren)
    'start_month' => '2026-01',

    'timezone' => 'Europe/Helsinki',
];
