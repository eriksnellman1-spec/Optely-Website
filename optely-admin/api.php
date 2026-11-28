<?php
declare(strict_types=1);

/**
 * JSON-API för automationer (n8n, Make, Zapier, egna skript).
 *
 * Autentisering: header "Authorization: Bearer <api_token>" (eller "X-Api-Key: <api_token>").
 *
 * GET  api.php?action=metrics[&month=2026-05]   Nyckeltal för ekonomi, fakturor och investeringar
 * GET  api.php?action=months | invoices | holdings
 * POST api.php  {"action": "...", ...}         Se integrationer.php för alla åtgärder och exempel.
 */

require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/metrics.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function fail(int $status, string $message): never
{
    respond($status, ['ok' => false, 'error' => $message]);
}

// ------------------------------------------------------------------ autentisering
$token = (string)config('api_token', '');
if (strlen($token) < 32) {
    fail(503, 'API:t är avstängt. Sätt api_token (minst 32 tecken) i app/config.php.');
}
$sent = '';
$auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if (stripos($auth, 'Bearer ') === 0) {
    $sent = trim(substr($auth, 7));
} elseif (!empty($_SERVER['HTTP_X_API_KEY'])) {
    $sent = trim((string)$_SERVER['HTTP_X_API_KEY']);
}
if ($sent === '' || !hash_equals($token, $sent)) {
    fail(401, 'Ogiltig eller saknad API-nyckel.');
}

// ------------------------------------------------------------------ hjälpare
function body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return $_POST;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, 'Ogiltig JSON i förfrågan.');
    }
    return $data;
}

function num_field(array $d, string $key, bool $allowNegative = false): ?float
{
    if (!array_key_exists($key, $d) || $d[$key] === null || $d[$key] === '') {
        return null;
    }
    $v = is_string($d[$key]) ? str_replace([' ', ','], ['', '.'], $d[$key]) : $d[$key];
    if (!is_numeric($v)) {
        fail(422, "Fältet \"$key\" måste vara ett tal.");
    }
    if (!$allowNegative && (float)$v < 0) {
        fail(422, "Fältet \"$key\" får inte vara negativt.");
    }
    return (float)$v;
}

function str_field(array $d, string $key, int $max = 500): ?string
{
    if (!array_key_exists($key, $d) || $d[$key] === null) {
        return null;
    }
    return mb_substr(trim((string)$d[$key]), 0, $max);
}

function date_field(array $d, string $key): ?string
{
    $v = str_field($d, $key, 10);
    if ($v === null || $v === '') {
        return null;
    }
    if (!valid_date($v)) {
        fail(422, "Fältet \"$key\" måste vara ett datum (ÅÅÅÅ-MM-DD).");
    }
    return $v;
}

function month_field(array $d, string $key = 'month'): string
{
    $m = str_field($d, $key, 7) ?? this_month();
    if (!valid_month($m)) {
        fail(422, "Fältet \"$key\" måste vara en månad (ÅÅÅÅ-MM).");
    }
    return $m;
}

const MONTH_FIELDS = ['revenue' => true, 'mrr' => false, 'one_off' => false, 'costs' => false,
    'customers' => false, 'leads' => false, 'hours' => false];

function find_invoice(array $d): ?array
{
    if (!empty($d['id'])) {
        return q1('SELECT * FROM invoices WHERE id = ?', [(int)$d['id']]);
    }
    if (!empty($d['external_id'])) {
        return q1('SELECT * FROM invoices WHERE external_id = ?', [(string)$d['external_id']]);
    }
    if (!empty($d['number'])) {
        return q1('SELECT * FROM invoices WHERE number = ? ORDER BY id DESC LIMIT 1', [(string)$d['number']]);
    }
    return null;
}

// ------------------------------------------------------------------ GET
try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = (string)($_GET['action'] ?? 'metrics');
        switch ($action) {
            case 'metrics':
                $month = isset($_GET['month']) && valid_month((string)$_GET['month']) ? (string)$_GET['month'] : null;
                $series = economy_series();
                $p = portfolio();
                unset($p['holdings'], $p['months']);
                foreach (['best', 'worst', 'biggest'] as $key) {
                    $p[$key] = $p[$key] ? ['name' => $p[$key]['name'], 'value' => (float)$p[$key]['value'], 'return_pct' => $p[$key]['return_pct']] : null;
                }
                $p['last_logged'] = $p['last_logged'] ? ['month' => $p['last_logged']['month'], 'total' => (float)$p['last_logged']['total']] : null;
                respond(200, [
                    'ok'          => true,
                    'generated'   => date('c'),
                    'economy'     => economy_kpis($series, $month),
                    'invoices'    => invoice_kpis(),
                    'investments' => $p,
                ]);
            case 'months':
                respond(200, ['ok' => true, 'months' => economy_series()]);
            case 'invoices':
                $rows = q('SELECT * FROM invoices ORDER BY issued DESC, id DESC');
                foreach ($rows as &$r) {
                    $r['total'] = round(invoice_total($r), 2);
                    $r['overdue'] = invoice_overdue($r);
                }
                respond(200, ['ok' => true, 'invoices' => $rows]);
            case 'holdings':
                $p = portfolio();
                respond(200, ['ok' => true, 'holdings' => $p['holdings'], 'months' => $p['months']]);
            default:
                fail(404, 'Okänd åtgärd: ' . $action);
        }
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail(405, 'Använd GET eller POST.');
    }

    // ------------------------------------------------------------------ POST
    $d = body();
    $action = (string)($d['action'] ?? '');

    switch ($action) {
        // Sätt fält för en månad (bara de fält som skickas ändras).
        case 'month.set':
        // Lägg till belopp på en månad, t.ex. en ny betalning eller kostnad.
        case 'month.add':
            $month = month_field($d);
            $set = [];
            foreach (MONTH_FIELDS as $field => $neg) {
                $v = num_field($d, $field, $neg || $action === 'month.add');
                if ($v !== null) {
                    $set[$field] = $v;
                }
            }
            $note = str_field($d, 'note', 2000);
            if (!$set && $note === null) {
                fail(422, 'Skicka minst ett av fälten: ' . implode(', ', array_keys(MONTH_FIELDS)) . ', note.');
            }
            exec_sql('INSERT IGNORE INTO months (month) VALUES (?)', [$month]);
            foreach ($set as $field => $v) {
                $sql = $action === 'month.add'
                    ? "UPDATE months SET `$field` = GREATEST(0, `$field` + ?) WHERE month = ?"
                    : "UPDATE months SET `$field` = ? WHERE month = ?";
                if ($action === 'month.add' && $field === 'revenue') {
                    $sql = 'UPDATE months SET revenue = revenue + ? WHERE month = ?';
                }
                exec_sql($sql, [$v, $month]);
            }
            if ($note !== null && $note !== '') {
                $action === 'month.add'
                    ? exec_sql("UPDATE months SET note = CASE WHEN note IS NULL OR note = '' THEN ? ELSE CONCAT(note, '\n', ?) END WHERE month = ?", [$note, $note, $month])
                    : exec_sql('UPDATE months SET note = ? WHERE month = ?', [$note, $month]);
            }
            log_event('api', $action, month_label($month) . ': ' . json_encode($set + ($note ? ['note' => $note] : []), JSON_UNESCAPED_UNICODE));
            respond(200, ['ok' => true, 'month' => q1('SELECT * FROM months WHERE month = ?', [$month])]);

        // Skapa eller uppdatera en faktura (matchas på external_id, sedan number).
        case 'invoice.upsert':
            $existing = find_invoice($d);
            $customer = str_field($d, 'customer', 190);
            if (!$existing && !$customer) {
                fail(422, 'Fältet "customer" krävs för nya fakturor.');
            }
            $status = str_field($d, 'status', 20);
            if ($status !== null && !in_array($status, INVOICE_STATUSES, true)) {
                fail(422, 'Status måste vara en av: ' . implode(', ', INVOICE_STATUSES));
            }
            $fields = array_filter([
                'number'      => str_field($d, 'number', 50),
                'customer'    => $customer,
                'description' => str_field($d, 'description', 500),
                'amount'      => num_field($d, 'amount'),
                'vat'         => num_field($d, 'vat'),
                'issued'      => date_field($d, 'issued'),
                'due'         => date_field($d, 'due'),
                'status'      => $status,
                'paid_at'     => date_field($d, 'paid_at') ?? ($status === 'Betald' ? today() : null),
                'external_id' => str_field($d, 'external_id', 120),
            ], fn($v) => $v !== null);
            if ($existing) {
                if ($fields) {
                    $sets = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($fields)));
                    exec_sql("UPDATE invoices SET $sets WHERE id = ?", [...array_values($fields), $existing['id']]);
                }
                $id = (int)$existing['id'];
            } else {
                $fields += ['source' => 'api', 'issued' => today()];
                $cols = implode(', ', array_map(fn($k) => "`$k`", array_keys($fields)));
                $marks = implode(', ', array_fill(0, count($fields), '?'));
                exec_sql("INSERT INTO invoices ($cols) VALUES ($marks)", array_values($fields));
                $id = (int)db()->lastInsertId();
            }
            $inv = q1('SELECT * FROM invoices WHERE id = ?', [$id]);
            log_event('api', $action, ($existing ? 'Uppdaterad' : 'Ny') . ' faktura ' . ($inv['number'] ?: '#' . $id) . ' – ' . $inv['customer'] . ', ' . eur2($inv['amount']) . ', ' . $inv['status']);
            respond(200, ['ok' => true, 'created' => !$existing, 'invoice' => $inv]);

        // Byt status på en faktura, t.ex. när betalningen syns på kontot.
        case 'invoice.status':
            $inv = find_invoice($d);
            if (!$inv) {
                fail(404, 'Hittade ingen faktura. Skicka id, external_id eller number.');
            }
            $status = str_field($d, 'status', 20) ?? 'Betald';
            if (!in_array($status, INVOICE_STATUSES, true)) {
                fail(422, 'Status måste vara en av: ' . implode(', ', INVOICE_STATUSES));
            }
            $paidAt = $status === 'Betald' ? (date_field($d, 'paid_at') ?? $inv['paid_at'] ?? today()) : null;
            exec_sql('UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?', [$status, $paidAt, $inv['id']]);
            log_event('api', $action, 'Faktura ' . ($inv['number'] ?: '#' . $inv['id']) . ' → ' . $status);
            respond(200, ['ok' => true, 'invoice' => q1('SELECT * FROM invoices WHERE id = ?', [$inv['id']])]);

        // Uppdatera värdet på ett innehav (skapas om det inte finns och "create" är true).
        case 'holding.value':
            $name = str_field($d, 'name', 190);
            $value = num_field($d, 'value');
            if (!$name || $value === null) {
                fail(422, 'Fälten "name" och "value" krävs.');
            }
            $h = q1('SELECT id FROM holdings WHERE name = ?', [$name]);
            if (!$h) {
                if (empty($d['create'])) {
                    fail(404, 'Hittade inget innehav som heter ' . $name . '. Skicka "create": true för att skapa det.');
                }
                $type = in_array($d['type'] ?? '', HOLDING_TYPES, true) ? (string)$d['type'] : 'Aktie';
                exec_sql('INSERT INTO holdings (name, type, value, purchase_value, purchase_date, updated) VALUES (?, ?, ?, ?, ?, ?)',
                    [$name, $type, $value, num_field($d, 'purchase_value') ?? $value, date_field($d, 'purchase_date') ?? today(), today()]);
            } else {
                exec_sql('UPDATE holdings SET value = ?, updated = ? WHERE id = ?', [$value, today(), $h['id']]);
            }
            log_event('api', $action, $name . ' → ' . eur($value));
            respond(200, ['ok' => true, 'holding' => q1('SELECT * FROM holdings WHERE name = ?', [$name])]);

        // Spara portföljvärdet för en månad (standard: innevarande månad och innehavens summa).
        case 'portfolio.log':
            $month = month_field($d);
            $total = log_portfolio_month($month, num_field($d, 'total'));
            log_event('api', $action, month_label($month) . ': ' . eur($total));
            respond(200, ['ok' => true, 'month' => $month, 'total' => $total]);

        default:
            fail(400, 'Okänd åtgärd. Tillgängliga: month.set, month.add, invoice.upsert, invoice.status, holding.value, portfolio.log');
    }
} catch (PDOException $e) {
    log_event('api', 'error', $e->getMessage(), false);
    fail(500, 'Databasfel. Se händelseloggen under Integrationer.');
}
