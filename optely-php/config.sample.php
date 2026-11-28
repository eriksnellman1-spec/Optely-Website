<?php
// Kopiera till config.php och fyll i. config.php laddas aldrig upp till GitHub.
return [
    // Hostinger → Databaser → MySQL-databaser
    'db_host' => 'localhost',
    'db_name' => 'u123456789_optely',
    'db_user' => 'u123456789_optely',
    'db_pass' => 'LÖSENORD',

    // Inloggning. Skapa hashen med sidan setup.php (tas bort efteråt) eller:
    //   php -r "echo password_hash('ditt-lösenord', PASSWORD_DEFAULT), PHP_EOL;"
    'user_email'    => 'erik@optely.eu',
    'password_hash' => '',

    // Ringkön
    'new_per_day'  => 15,   // nya bolag som släpps in i Idag per ringdag
    'max_attempts' => 4,    // obesvarade samtal innan bolaget flyttas till "Inget svar"
];
