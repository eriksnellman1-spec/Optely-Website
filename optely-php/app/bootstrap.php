<?php
declare(strict_types=1);

date_default_timezone_set('Europe/Helsinki');
mb_internal_encoding('UTF-8');

$configFile = __DIR__ . '/../config.php';
if (!is_file($configFile)) {
    http_response_code(500);
    exit('config.php saknas. Kopiera config.sample.php till config.php och fyll i uppgifterna.');
}
$CONFIG = require $configFile;

session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path' => '/',
    'secure' => (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function config(string $key)
{
    global $CONFIG;
    return $CONFIG[$key] ?? null;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', config('db_host'), config('db_name'));
        $pdo = new PDO($dsn, config('db_user'), config('db_pass'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

/** Kör en fråga med parametrar och returnerar statement. */
function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function today(): string
{
    return date('Y-m-d');
}

/** Nästa vardag efter $date (lör/sön hoppas över). */
function next_weekday(string $date): string
{
    $d = new DateTime($date);
    do {
        $d->modify('+1 day');
    } while ((int) $d->format('N') >= 6);
    return $d->format('Y-m-d');
}

function fmt_date(?string $dt): string
{
    return $dt ? date('d.m.Y', strtotime($dt)) : '';
}

function fmt_datetime(?string $dt): string
{
    return $dt ? date('d.m.Y H:i', strtotime($dt)) : '';
}

function fmt_eur(?int $v): string
{
    return $v === null ? '' : number_format($v, 0, ',', ' ') . ' €';
}

function redirect(string $to): never
{
    header('Location: ' . $to);
    exit;
}

function flash(?string $msg = null, string $kind = 'ok'): ?array
{
    if ($msg !== null) {
        $_SESSION['flash'] = ['msg' => $msg, 'kind' => $kind];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

/** Alla POST måste ha rätt token. */
function check_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !hash_equals(csrf_token(), (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(400);
        exit('Ogiltig begäran. Ladda om sidan och försök igen.');
    }
}

function require_login(): void
{
    if (empty($_SESSION['user'])) {
        redirect('login.php');
    }
}

function post(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}

function nullable(string $v): ?string
{
    return $v === '' ? null : $v;
}

/** Statusar och hur de visas. */
const STATUS = [
    'ny' => ['Ny', 'gray'],
    'ko' => ['I ringkön', 'blue'],
    'ring_senare' => ['Ring senare', 'blue'],
    'mote_bokat' => ['Möte bokat', 'green'],
    'kund' => ['Kund', 'green'],
    'nej' => ['Nej', 'red'],
    'inget_svar' => ['Inget svar', 'yellow'],
    'ring_ej' => ['Ring ej', 'red'],
];

const OUTCOME = [
    'inget_svar' => 'Inget svar',
    'nej' => 'Svar – nej',
    'ring_senare' => 'Ring senare',
    'mote_bokat' => 'Möte bokat',
    'fel_person' => 'Fel person',
    'ring_ej' => 'Ring ej',
    'kund' => 'Blev kund',
    'ingen_affar' => 'Ingen affär',
];

function status_badge(string $status): string
{
    [$label, $tone] = STATUS[$status] ?? [$status, 'gray'];
    return '<span class="badge badge-' . $tone . '">' . e($label) . '</span>';
}
