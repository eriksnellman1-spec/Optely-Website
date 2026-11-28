<?php
declare(strict_types=1);

/**
 * Gemensam start för alla sidor: konfiguration, databas, session och hjälpfunktioner.
 */

const APP_DIR = __DIR__;

$configFile = APP_DIR . '/config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    exit('Saknar app/config.php. Kopiera app/config.example.php till app/config.php och fyll i dina uppgifter.');
}
/** @var array<string,mixed> $CONFIG */
$CONFIG = require $configFile;

date_default_timezone_set((string)($CONFIG['timezone'] ?? 'Europe/Helsinki'));

function config(string $key, mixed $default = null): mixed
{
    global $CONFIG;
    return $CONFIG[$key] ?? $default;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        config('db_host', 'localhost'),
        config('db_name'),
        config('db_charset', 'utf8mb4')
    );
    $pdo = new PDO($dsn, (string)config('db_user'), (string)config('db_pass'), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

/** @return list<array<string,mixed>> */
function q(string $sql, array $params = []): array
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

function q1(string $sql, array $params = []): ?array
{
    $rows = q($sql, $params);
    return $rows[0] ?? null;
}

function exec_sql(string $sql, array $params = []): int
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->rowCount();
}

// ---------------------------------------------------------------- session

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('optely_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function is_logged_in(): bool
{
    start_session();
    return !empty($_SESSION['admin']);
}

function require_login(): void
{
    if (!is_logged_in()) {
        redirect('login.php');
    }
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . h(csrf_token()) . '">';
}

function verify_csrf(): void
{
    $sent = (string)($_POST['_csrf'] ?? '');
    if (!hash_equals(csrf_token(), $sent)) {
        http_response_code(400);
        exit('Ogiltig förfrågan (CSRF). Ladda om sidan och försök igen.');
    }
}

function flash(string $type, string $message): void
{
    start_session();
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

/** @return list<array{type:string,message:string}> */
function take_flashes(): array
{
    start_session();
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

function redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

function client_ip(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

// ---------------------------------------------------------------- formatering

function h(mixed $v): string
{
    return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

const NBSP = "\u{00A0}";

/** 1234.5 -> "1 235 €" (sv-FI) */
function eur(float|int|string|null $n, int $decimals = 0): string
{
    $n = (float)$n;
    $s = number_format(abs($n), $decimals, ',', NBSP) . NBSP . '€';
    return ($n < 0 && round(abs($n), $decimals) > 0 ? '−' : '') . $s;
}

function eur2(float|int|string|null $n): string
{
    return eur($n, 2);
}

function num(float|int|string|null $n, int $decimals = 1): string
{
    $n = (float)$n;
    $out = number_format($n, $decimals, ',', NBSP);
    if ($decimals > 0) {
        $out = rtrim(rtrim($out, '0'), ',');
    }
    return $out;
}

/** Procent med tecken: +12,3 % eller "–" */
function pct(?float $n): string
{
    if ($n === null || !is_finite($n)) {
        return '–';
    }
    return ($n > 0 ? '+' : ($n < 0 ? '−' : '')) . num(abs($n)) . NBSP . '%';
}

function change_pct(float $current, ?float $previous): ?float
{
    if ($previous === null || abs($previous) < 0.000001) {
        return null;
    }
    return (($current - $previous) / abs($previous)) * 100;
}

const MONTH_NAMES = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli',
    'augusti', 'september', 'oktober', 'november', 'december'];

/** "2026-05" -> "maj 2026" */
function month_label(string $month): string
{
    [$y, $m] = array_pad(explode('-', $month), 2, '01');
    return (MONTH_NAMES[(int)$m - 1] ?? $m) . ' ' . $y;
}

/** "2026-05" -> "maj 26" */
function month_short(string $month): string
{
    [$y, $m] = array_pad(explode('-', $month), 2, '01');
    return mb_substr(MONTH_NAMES[(int)$m - 1] ?? $m, 0, 3) . ' ' . substr($y, 2);
}

function date_fi(?string $iso): string
{
    if (!$iso) {
        return '–';
    }
    $t = strtotime($iso);
    return $t ? date('j.n.Y', $t) : '–';
}

function today(): string
{
    return date('Y-m-d');
}

function this_month(): string
{
    return date('Y-m');
}

/** Hela månader mellan två datum, minst 1 (samma regel som i Lovable-appen). */
function months_between(?string $start, string $end): int
{
    if (!$start) {
        return 1;
    }
    $s = strtotime($start);
    $e = strtotime($end);
    if (!$s || !$e) {
        return 1;
    }
    $months = ((int)date('Y', $e) - (int)date('Y', $s)) * 12 + ((int)date('n', $e) - (int)date('n', $s));
    return max(1, $months);
}

/** Lista med månader från startmånaden fram till nästa månad, nyaste först. */
function month_options(): array
{
    $start = (string)config('start_month', '2026-01');
    $end = date('Y-m', strtotime('first day of next month'));
    $out = [];
    for ($m = $start; $m <= $end; $m = date('Y-m', strtotime($m . '-01 +1 month'))) {
        $out[] = $m;
    }
    return array_reverse($out);
}

// ---------------------------------------------------------------- formulärvärden

/** Läser ett tal från formulär (tillåter komma som decimaltecken). Tomt -> $default. */
function post_num(string $key, ?float $default = 0.0): ?float
{
    $raw = trim((string)($_POST[$key] ?? ''));
    if ($raw === '') {
        return $default;
    }
    $raw = str_replace([' ', NBSP, ','], ['', '', '.'], $raw);
    if (!is_numeric($raw)) {
        throw new InvalidArgumentException('Ogiltigt tal i fältet "' . $key . '".');
    }
    return (float)$raw;
}

function post_str(string $key, int $max = 500): string
{
    return mb_substr(trim((string)($_POST[$key] ?? '')), 0, $max);
}

function valid_month(string $m): bool
{
    return (bool)preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $m);
}

function valid_date(string $d): bool
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
        return false;
    }
    [$y, $m, $day] = array_map('intval', explode('-', $d));
    return checkdate($m, $day, $y);
}

function log_event(string $source, string $type, string $summary, bool $ok = true): void
{
    try {
        exec_sql(
            'INSERT INTO events (source, type, summary, ok) VALUES (?, ?, ?, ?)',
            [$source, mb_substr($type, 0, 80), mb_substr($summary, 0, 500), $ok ? 1 : 0]
        );
    } catch (Throwable) {
        // Loggning får aldrig stoppa själva händelsen.
    }
}

/** JSON till ett <script type="application/json">-block utan att kunna bryta ut ur taggen. */
function json_attr(mixed $data): string
{
    return json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
}
