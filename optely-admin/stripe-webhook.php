<?php
declare(strict_types=1);

/**
 * Stripe-webhook. Lägg till endpointen i Stripe → Developers → Webhooks och välj händelserna:
 *   invoice.finalized, invoice.paid, invoice.voided, invoice.marked_uncollectible, checkout.session.completed
 * Kopiera "Signing secret" (whsec_...) till stripe_webhook_secret i app/config.php.
 */

require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/metrics.php';

header('Content-Type: application/json; charset=utf-8');

function done(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => $status < 300, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    done(405, 'Endast POST.');
}

$secret = (string)config('stripe_webhook_secret', '');
if ($secret === '') {
    done(503, 'Stripe är inte konfigurerat (stripe_webhook_secret saknas).');
}

$payload = file_get_contents('php://input') ?: '';
$header = (string)($_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '');

// ------------------------------------------------------------------ verifiera signaturen
$timestamp = null;
$signatures = [];
foreach (explode(',', $header) as $part) {
    [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
    if ($k === 't') {
        $timestamp = (int)$v;
    } elseif ($k === 'v1') {
        $signatures[] = $v;
    }
}
if (!$timestamp || !$signatures) {
    done(400, 'Saknar giltig Stripe-Signature.');
}
if (abs(time() - $timestamp) > 300) {
    done(400, 'Signaturen är för gammal.');
}
$expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
$valid = false;
foreach ($signatures as $sig) {
    if (hash_equals($expected, $sig)) {
        $valid = true;
        break;
    }
}
if (!$valid) {
    log_event('stripe', 'signature', 'Ogiltig signatur avvisad', false);
    done(400, 'Ogiltig signatur.');
}

$event = json_decode($payload, true);
if (!is_array($event) || empty($event['type'])) {
    done(400, 'Ogiltig händelse.');
}
$type = (string)$event['type'];
$obj = $event['data']['object'] ?? [];

// ------------------------------------------------------------------ hjälpare
function cents(mixed $v): float
{
    return round(((int)$v) / 100, 2);
}

function ts_date(mixed $ts): ?string
{
    return $ts ? date('Y-m-d', (int)$ts) : null;
}

/** Skapar eller uppdaterar en faktura från Stripe. Returnerar [id, föregående status]. */
function upsert_stripe_invoice(array $f): array
{
    $existing = q1('SELECT id, status FROM invoices WHERE external_id = ?', [$f['external_id']]);
    if ($existing) {
        $fields = array_filter($f, fn($v) => $v !== null);
        // Skriv aldrig över en betald faktura med en tidigare status (händelser kan komma i fel ordning).
        if ($existing['status'] === 'Betald' && ($fields['status'] ?? '') !== 'Krediterad') {
            unset($fields['status'], $fields['paid_at']);
        }
        if ($fields) {
            $sets = implode(', ', array_map(fn($k) => "`$k` = ?", array_keys($fields)));
            exec_sql("UPDATE invoices SET $sets WHERE id = ?", [...array_values($fields), $existing['id']]);
        }
        return [(int)$existing['id'], $existing['status']];
    }
    $f['source'] = 'stripe';
    $f = array_filter($f, fn($v) => $v !== null);
    $cols = implode(', ', array_map(fn($k) => "`$k`", array_keys($f)));
    exec_sql("INSERT INTO invoices ($cols) VALUES (" . implode(', ', array_fill(0, count($f), '?')) . ')', array_values($f));
    return [(int)db()->lastInsertId(), null];
}

/** Lägger en ny betalning på månadens omsättning (och MRR eller engångsintäkt). */
function add_to_month(string $paidAt, float $amount, bool $recurring): void
{
    if (!config('stripe_add_to_month', false) || $amount <= 0) {
        return;
    }
    $month = substr($paidAt, 0, 7);
    exec_sql('INSERT IGNORE INTO months (month) VALUES (?)', [$month]);
    $col = $recurring ? 'mrr' : 'one_off';
    exec_sql("UPDATE months SET revenue = revenue + ?, `$col` = `$col` + ? WHERE month = ?", [$amount, $amount, $month]);
}

// ------------------------------------------------------------------ händelser
try {
    switch ($type) {
        case 'invoice.finalized':
        case 'invoice.sent':
        case 'invoice.paid':
        case 'invoice.payment_succeeded':
        case 'invoice.voided':
        case 'invoice.marked_uncollectible':
            $status = match ($type) {
                'invoice.paid', 'invoice.payment_succeeded' => 'Betald',
                'invoice.voided', 'invoice.marked_uncollectible' => 'Krediterad',
                default => 'Skickad',
            };
            $subtotal = cents($obj['subtotal_excluding_tax'] ?? $obj['subtotal'] ?? 0);
            $tax = cents($obj['tax'] ?? 0);
            $paidAt = $status === 'Betald' ? (ts_date($obj['status_transitions']['paid_at'] ?? null) ?? today()) : null;
            $line = $obj['lines']['data'][0]['description'] ?? '';
            [$id, $before] = upsert_stripe_invoice([
                'external_id' => (string)$obj['id'],
                'number'      => $obj['number'] ?? null,
                'customer'    => mb_substr((string)($obj['customer_name'] ?: ($obj['customer_email'] ?? 'Stripe-kund')), 0, 190),
                'description' => mb_substr((string)$line, 0, 500),
                'amount'      => $subtotal,
                'vat'         => $subtotal > 0 ? round($tax / $subtotal * 100, 2) : 0,
                'issued'      => ts_date($obj['created'] ?? null),
                'due'         => ts_date($obj['due_date'] ?? null),
                'status'      => $status,
                'paid_at'     => $paidAt,
            ]);
            if ($status === 'Betald' && $before !== 'Betald') {
                add_to_month($paidAt, $subtotal, !empty($obj['subscription']));
            }
            log_event('stripe', $type, 'Faktura ' . ($obj['number'] ?? $obj['id']) . ' – ' . eur2($subtotal) . ' → ' . $status);
            done(200, 'Faktura sparad (#' . $id . ').');

        case 'checkout.session.completed':
            // Engångsbetalningar via Checkout utan Stripe-faktura
            if (($obj['payment_status'] ?? '') !== 'paid' || !empty($obj['invoice'])) {
                done(200, 'Ignorerad (obetald eller hanteras som faktura).');
            }
            $subtotal = cents($obj['amount_subtotal'] ?? 0);
            $tax = cents($obj['total_details']['amount_tax'] ?? 0);
            [$id, $before] = upsert_stripe_invoice([
                'external_id' => (string)$obj['id'],
                'number'      => null,
                'customer'    => mb_substr((string)($obj['customer_details']['name'] ?? $obj['customer_details']['email'] ?? 'Stripe-kund'), 0, 190),
                'description' => 'Stripe Checkout',
                'amount'      => $subtotal,
                'vat'         => $subtotal > 0 ? round($tax / $subtotal * 100, 2) : 0,
                'issued'      => ts_date($obj['created'] ?? null) ?? today(),
                'due'         => null,
                'status'      => 'Betald',
                'paid_at'     => ts_date($obj['created'] ?? null) ?? today(),
            ]);
            if ($before !== 'Betald') {
                add_to_month(ts_date($obj['created'] ?? null) ?? today(), $subtotal, ($obj['mode'] ?? '') === 'subscription');
            }
            log_event('stripe', $type, 'Checkout-betalning ' . eur2($subtotal));
            done(200, 'Betalning sparad (#' . $id . ').');

        default:
            done(200, 'Ignorerad händelse: ' . $type);
    }
} catch (Throwable $e) {
    log_event('stripe', $type, 'Fel: ' . $e->getMessage(), false);
    done(500, 'Kunde inte spara händelsen.');
}
