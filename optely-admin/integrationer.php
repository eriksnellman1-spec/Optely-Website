<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/metrics.php';
require __DIR__ . '/app/layout.php';
require_login();

const LOVABLE_PREFIX = 'optely.kontrollbok.';

/** Importerar data som kopierats ur Lovable-appens localStorage. Returnerar antal per typ. */
function import_lovable(array $data): array
{
    $get = fn(string $key) => $data[LOVABLE_PREFIX . $key] ?? $data[$key] ?? null;
    $count = ['månader' => 0, 'fakturor' => 0, 'innehav' => 0, 'portföljmånader' => 0];
    $n = fn($v) => is_numeric($v) ? (float)$v : 0.0;

    db()->beginTransaction();
    try {
        $overrides = (array)($get('optely.overrides') ?? []);
        foreach ((array)($get('optely.months') ?? []) as $m) {
            if (!is_array($m) || !valid_month((string)($m['month'] ?? ''))) {
                continue;
            }
            $o = (array)($overrides[$m['month']] ?? []);
            exec_sql(
                'INSERT INTO months (month, revenue, mrr, one_off, costs, customers, leads, hours, note, cum_revenue_override, cum_net_override)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE revenue=VALUES(revenue), mrr=VALUES(mrr), one_off=VALUES(one_off), costs=VALUES(costs),
                   customers=VALUES(customers), leads=VALUES(leads), hours=VALUES(hours), note=VALUES(note),
                   cum_revenue_override=VALUES(cum_revenue_override), cum_net_override=VALUES(cum_net_override)',
                [$m['month'], $n($m['revenue'] ?? 0), $n($m['mrr'] ?? 0), $n($m['oneOff'] ?? 0), $n($m['costs'] ?? 0),
                    (int)($m['customers'] ?? 0), (int)($m['leads'] ?? 0), $n($m['hours'] ?? 0), (string)($m['note'] ?? ''),
                    isset($o['cum']) && is_numeric($o['cum']) ? (float)$o['cum'] : null,
                    isset($o['cumNet']) && is_numeric($o['cumNet']) ? (float)$o['cumNet'] : null]
            );
            $count['månader']++;
        }

        foreach ((array)($get('optely.invoices') ?? []) as $i) {
            if (!is_array($i) || trim((string)($i['customer'] ?? '')) === '') {
                continue;
            }
            $status = in_array($i['status'] ?? '', INVOICE_STATUSES, true) ? $i['status'] : 'Utkast';
            $issued = valid_date((string)($i['issued'] ?? '')) ? $i['issued'] : null;
            $due = valid_date((string)($i['due'] ?? '')) ? $i['due'] : null;
            $extId = 'lovable:' . ($i['id'] ?? md5(json_encode($i)));
            exec_sql(
                'INSERT INTO invoices (number, customer, description, amount, vat, issued, due, status, paid_at, source, external_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE number=VALUES(number), customer=VALUES(customer), description=VALUES(description),
                   amount=VALUES(amount), vat=VALUES(vat), issued=VALUES(issued), due=VALUES(due), status=VALUES(status)',
                [($i['number'] ?? '') ?: null, mb_substr((string)$i['customer'], 0, 190), mb_substr((string)($i['description'] ?? ''), 0, 500),
                    $n($i['amount'] ?? 0), $n($i['vat'] ?? 25.5), $issued, $due, $status,
                    $status === 'Betald' ? ($due ?? $issued) : null, 'import', $extId]
            );
            $count['fakturor']++;
        }

        foreach ((array)($get('invest.holdings') ?? []) as $h) {
            if (!is_array($h) || trim((string)($h['name'] ?? '')) === '') {
                continue;
            }
            exec_sql(
                'INSERT INTO holdings (name, type, value, purchase_value, purchase_date, monthly_saving, illiquid, return_pct_override, updated)
                 VALUES (?,?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE type=VALUES(type), value=VALUES(value), purchase_value=VALUES(purchase_value),
                   purchase_date=VALUES(purchase_date), monthly_saving=VALUES(monthly_saving), illiquid=VALUES(illiquid),
                   return_pct_override=VALUES(return_pct_override), updated=VALUES(updated)',
                [mb_substr(trim((string)$h['name']), 0, 190), in_array($h['type'] ?? '', HOLDING_TYPES, true) ? $h['type'] : 'Aktie',
                    $n($h['value'] ?? 0), $n($h['purchaseValue'] ?? 0),
                    valid_date((string)($h['purchaseDate'] ?? '')) ? $h['purchaseDate'] : null,
                    $n($h['monthlySaving'] ?? 0), !empty($h['illiquid']) ? 1 : 0,
                    isset($h['returnPctOverride']) && is_numeric($h['returnPctOverride']) ? (float)$h['returnPctOverride'] : null,
                    valid_date((string)($h['updated'] ?? '')) ? $h['updated'] : today()]
            );
            $count['innehav']++;
        }

        foreach ((array)($get('invest.months') ?? []) as $m) {
            if (!is_array($m) || !valid_month((string)($m['month'] ?? ''))) {
                continue;
            }
            $snap = [];
            foreach ((array)($m['values'] ?? []) as $hid => $val) {
                $snap[] = ['name' => (string)($m['names'][$hid] ?? $hid), 'value' => $n($val)];
            }
            exec_sql(
                'INSERT INTO invest_months (month, total, snapshot) VALUES (?,?,?)
                 ON DUPLICATE KEY UPDATE total=VALUES(total), snapshot=VALUES(snapshot)',
                [$m['month'], $n($m['total'] ?? 0), $snap ? json_encode($snap, JSON_UNESCAPED_UNICODE) : null]
            );
            $count['portföljmånader']++;
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }
    return $count;
}

// ------------------------------------------------------------------ export
if (($_GET['export'] ?? '') === 'json') {
    $export = [
        'exported' => date('c'),
        'months' => q('SELECT * FROM months ORDER BY month'),
        'invoices' => q('SELECT * FROM invoices ORDER BY id'),
        'holdings' => q('SELECT * FROM holdings ORDER BY id'),
        'invest_months' => q('SELECT * FROM invest_months ORDER BY month'),
    ];
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="optely-admin-' . date('Y-m-d') . '.json"');
    echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// ------------------------------------------------------------------ åtgärder
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'import_lovable') {
        $data = json_decode((string)($_POST['json'] ?? ''), true);
        if (!is_array($data)) {
            flash('error', 'Kunde inte läsa JSON. Kontrollera att du klistrat in hela texten.');
        } else {
            try {
                $c = import_lovable($data);
                $summary = implode(', ', array_map(fn($k, $v) => "$v $k", array_keys($c), $c));
                log_event('import', 'lovable', $summary);
                flash(array_sum($c) > 0 ? 'ok' : 'error', array_sum($c) > 0 ? 'Importerat: ' . $summary . '.' : 'Hittade ingen Optely-data i texten.');
            } catch (Throwable $e) {
                flash('error', 'Importen misslyckades: ' . $e->getMessage());
            }
        }
        redirect('integrationer.php#import');
    }

    if ($action === 'clear_events') {
        exec_sql('DELETE FROM events');
        flash('ok', 'Händelseloggen är tömd.');
        redirect('integrationer.php#logg');
    }

    if ($action === 'wipe_all') {
        if (post_str('confirm', 20) !== 'RADERA') {
            flash('error', 'Skriv RADERA för att bekräfta.');
        } else {
            foreach (['months', 'invoices', 'holdings', 'invest_months', 'events'] as $t) {
                exec_sql("DELETE FROM `$t`");
            }
            flash('ok', 'All data är raderad.');
        }
        redirect('integrationer.php');
    }
}

// ------------------------------------------------------------------ vy
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$base = ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'din-doman.se') . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
$apiUrl = $base . '/api.php';
$stripeUrl = $base . '/stripe-webhook.php';
$apiOn = strlen((string)config('api_token', '')) >= 32;
$stripeOn = (string)config('stripe_webhook_secret', '') !== '';
$events = q('SELECT * FROM events ORDER BY id DESC LIMIT 50');

$counts = q1('SELECT (SELECT COUNT(*) FROM months) AS months, (SELECT COUNT(*) FROM invoices) AS invoices,
              (SELECT COUNT(*) FROM holdings) AS holdings, (SELECT COUNT(*) FROM invest_months) AS invest_months');

$consoleSnippet = "copy(JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('optely.kontrollbok.')).map(k => [k, JSON.parse(localStorage.getItem(k))]))))";

page_header('Integrationer', 'integrationer');
page_title('Integrationer', 'API för automationer, Stripe, import från Lovable och export.');
?>

<div class="kpis">
  <?= kpi('API', $apiOn ? 'Aktivt' : 'Avstängt', $apiOn ? 'nyckel inställd' : 'sätt api_token i config', null, false, $apiOn ? 'accent' : '') ?>
  <?= kpi('Stripe', $stripeOn ? 'Kopplat' : 'Ej kopplat', $stripeOn ? (config('stripe_add_to_month') ? 'fakturor + månadsdata' : 'fakturor') : 'sätt stripe_webhook_secret') ?>
  <?= kpi('Månader', (string)$counts['months'], 'i databasen') ?>
  <?= kpi('Fakturor', (string)$counts['invoices'], 'i databasen') ?>
  <?= kpi('Innehav', (string)$counts['holdings'], $counts['invest_months'] . ' loggade månader') ?>
</div>

<section class="section" id="api">
  <div class="section-head"><div><h2>API för n8n, Make och skript</h2><p>Skicka nyckeln i headern <code>Authorization: Bearer &lt;api_token&gt;</code>. Nyckeln står i <code>app/config.php</code>.</p></div></div>
  <div class="section-body">
    <?php if (!$apiOn): ?>
      <div class="callout warn" style="margin-bottom:16px">API:t är avstängt. Skapa en nyckel med <code>php -r "echo bin2hex(random_bytes(24));"</code> (eller valfri slumpad sträng på minst 32 tecken) och spara den som <code>api_token</code> i <code>app/config.php</code>.</div>
    <?php endif; ?>
    <div class="field">
      <label for="api-url">Endpoint</label>
      <div class="copy-row"><input id="api-url" readonly value="<?= h($apiUrl) ?>"><button type="button" class="btn btn-sm" data-copy="api-url">Kopiera</button></div>
    </div>

    <hr class="sep">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Åtgärd</th><th>Vad den gör</th><th>Fält</th></tr></thead>
        <tbody>
          <tr><td><code>GET ?action=metrics</code></td><td>Alla nyckeltal: ekonomi, fakturor och investeringar. Perfekt för en veckorapport i Slack eller mejl.</td><td><code>month</code> (valfri)</td></tr>
          <tr><td><code>GET ?action=months</code> · <code>invoices</code> · <code>holdings</code></td><td>Rådata som listor.</td><td>–</td></tr>
          <tr><td><code>month.set</code></td><td>Sätter fält för en månad. Bara de fält du skickar ändras.</td><td><code>month</code>, <code>revenue</code>, <code>mrr</code>, <code>one_off</code>, <code>costs</code>, <code>customers</code>, <code>leads</code>, <code>hours</code>, <code>note</code></td></tr>
          <tr><td><code>month.add</code></td><td>Lägger till på befintliga värden, t.ex. en ny kostnad, en betalning eller ett nytt lead.</td><td>samma som ovan</td></tr>
          <tr><td><code>invoice.upsert</code></td><td>Skapar eller uppdaterar en faktura (matchas på <code>external_id</code>, sedan <code>number</code>).</td><td><code>customer</code>, <code>amount</code>, <code>vat</code>, <code>number</code>, <code>external_id</code>, <code>issued</code>, <code>due</code>, <code>status</code>, <code>description</code></td></tr>
          <tr><td><code>invoice.status</code></td><td>Byter status, t.ex. till Betald när pengarna syns på kontot.</td><td><code>number</code> / <code>external_id</code> / <code>id</code>, <code>status</code>, <code>paid_at</code></td></tr>
          <tr><td><code>holding.value</code></td><td>Uppdaterar ett innehavs värde.</td><td><code>name</code>, <code>value</code>, <code>create</code>, <code>type</code></td></tr>
          <tr><td><code>portfolio.log</code></td><td>Sparar månadens portföljvärde (standard: innehavens summa).</td><td><code>month</code>, <code>total</code></td></tr>
        </tbody>
      </table>
    </div>

    <details style="margin-top:16px">
      <summary>Exempel</summary>
<pre>curl -H "Authorization: Bearer $OPTELY_TOKEN" "<?= h($apiUrl) ?>?action=metrics"

curl -X POST "<?= h($apiUrl) ?>" \
  -H "Authorization: Bearer $OPTELY_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"month.add","month":"<?= h(this_month()) ?>","costs":29,"note":"Ny prenumeration: Make"}'

curl -X POST "<?= h($apiUrl) ?>" \
  -H "Authorization: Bearer $OPTELY_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"invoice.status","number":"2026-002","status":"Betald"}'</pre>
      <p class="muted" style="margin-top:12px"><strong>I n8n:</strong> använd noden <em>HTTP Request</em>, välj Authentication → <em>Generic Credential Type</em> → <em>Header Auth</em> med namnet <code>Authorization</code> och värdet <code>Bearer &lt;din nyckel&gt;</code>. Body: JSON enligt exemplen.</p>
    </details>
  </div>
</section>

<section class="section" id="stripe">
  <div class="section-head"><div><h2>Stripe</h2><p>Fakturor från Stripe hamnar automatiskt i fakturalistan och markeras som betalda när kunden betalar.</p></div></div>
  <div class="section-body">
    <div class="field">
      <label for="stripe-url">Webhook-URL</label>
      <div class="copy-row"><input id="stripe-url" readonly value="<?= h($stripeUrl) ?>"><button type="button" class="btn btn-sm" data-copy="stripe-url">Kopiera</button></div>
    </div>
    <ol class="muted" style="margin:14px 0 0; padding-left:18px">
      <li>Stripe → Developers → Webhooks → <em>Add endpoint</em> och klistra in URL:en ovan.</li>
      <li>Välj händelserna <code>invoice.finalized</code>, <code>invoice.paid</code>, <code>invoice.voided</code>, <code>invoice.marked_uncollectible</code> och <code>checkout.session.completed</code>.</li>
      <li>Kopiera <em>Signing secret</em> (<code>whsec_…</code>) till <code>stripe_webhook_secret</code> i <code>app/config.php</code>.</li>
      <li>Vill du att betalningar även läggs på månadens omsättning? Sätt <code>stripe_add_to_month</code> till <code>true</code>.</li>
    </ol>
  </div>
</section>

<section class="section" id="import">
  <div class="section-head"><div><h2>Importera från Lovable</h2><p>Flyttar ekonomi, fakturor, innehav och portföljhistorik från optely-insight-hub. Befintliga poster med samma månad eller namn skrivs över.</p></div></div>
  <form method="post" class="section-body">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="import_lovable">
    <ol class="muted" style="margin:0 0 14px; padding-left:18px">
      <li>Öppna Lovable-appen i webbläsaren och logga in, så att all data är laddad (besök gärna både Optely- och Investeringar-fliken).</li>
      <li>Öppna utvecklarkonsolen (<kbd>F12</kbd> → <em>Console</em>), klistra in raden nedan och tryck Enter. Datan kopieras då till urklipp.</li>
      <li>Klistra in den i rutan nedan och klicka på <em>Importera</em>.</li>
    </ol>
    <div class="copy-row"><input id="snippet" readonly value="<?= h($consoleSnippet) ?>"><button type="button" class="btn btn-sm" data-copy="snippet">Kopiera</button></div>
    <div class="field" style="margin-top:14px">
      <label for="json">Data från Lovable (JSON)</label>
      <textarea id="json" name="json" rows="5" placeholder='{"optely.kontrollbok.optely.months": [...], ...}' required></textarea>
    </div>
    <div class="form-actions"><button class="btn btn-primary" type="submit">Importera</button></div>
  </form>
</section>

<section class="section" id="logg">
  <div class="section-head">
    <div><h2>Händelselogg</h2><p>Det senaste som kommit in via API, Stripe och import.</p></div>
    <?php if ($events): ?>
      <form method="post" data-confirm="Töm händelseloggen?"><?= csrf_field() ?><input type="hidden" name="action" value="clear_events"><button class="btn btn-sm" type="submit">Töm logg</button></form>
    <?php endif; ?>
  </div>
  <div class="section-body flush">
    <?php if (!$events): ?>
      <?= empty_state('Inga händelser ännu', 'När n8n, Stripe eller en import skickar data syns det här.') ?>
    <?php else: ?>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Tid</th><th>Källa</th><th>Händelse</th><th>Detaljer</th></tr></thead>
        <tbody>
        <?php foreach ($events as $e): ?>
          <tr>
            <td style="white-space:nowrap"><?= h(date('j.n. H:i', strtotime($e['created_at']))) ?></td>
            <td><span class="badge badge-<?= $e['ok'] ? 'teal' : 'red' ?>"><?= h($e['source']) ?></span></td>
            <td><code><?= h($e['type']) ?></code></td>
            <td class="<?= $e['ok'] ? '' : 'neg' ?>"><?= h($e['summary']) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>
</section>

<div class="grid-2 stack-20">
  <section class="section">
    <div class="section-head"><div><h2>Exportera</h2><p>All data som en JSON-fil, som backup.</p></div></div>
    <div class="section-body"><a class="btn" href="integrationer.php?export=json">Ladda ner JSON</a></div>
  </section>
  <section class="section">
    <div class="section-head"><div><h2>Rensa all data</h2><p>Raderar månader, fakturor, innehav och logg. Går inte att ångra.</p></div></div>
    <form method="post" class="section-body" data-confirm="Är du säker? All data raderas permanent.">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="wipe_all">
      <div class="copy-row"><input name="confirm" placeholder="Skriv RADERA" autocomplete="off"><button class="btn btn-danger" type="submit">Rensa</button></div>
    </form>
  </section>
</div>

<?php page_footer();
