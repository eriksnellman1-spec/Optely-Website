<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/metrics.php';
require __DIR__ . '/app/layout.php';
require_login();

// ------------------------------------------------------------------ åtgärder
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = (string)($_POST['action'] ?? '');
    $id = (int)($_POST['id'] ?? 0);
    try {
        if ($action === 'save_invoice') {
            $customer = post_str('customer', 190);
            if ($customer === '') {
                throw new InvalidArgumentException('Kund är obligatoriskt.');
            }
            $amount = post_num('amount');
            if ($amount < 0) {
                throw new InvalidArgumentException('Belopp måste vara noll eller positivt.');
            }
            $vat = post_num('vat', 25.5);
            $issued = post_str('issued', 10);
            $due = post_str('due', 10);
            $paidAt = post_str('paid_at', 10);
            foreach (['Fakturadatum' => $issued, 'Förfallodatum' => $due, 'Betaldatum' => $paidAt] as $label => $d) {
                if ($d !== '' && !valid_date($d)) {
                    throw new InvalidArgumentException($label . ' är inte ett giltigt datum.');
                }
            }
            if ($due !== '' && $issued !== '' && $due < $issued) {
                throw new InvalidArgumentException('Förfallodatum kan inte vara före fakturadatum.');
            }
            $status = in_array($_POST['status'] ?? '', INVOICE_STATUSES, true) ? (string)$_POST['status'] : 'Utkast';
            if ($status === 'Betald' && $paidAt === '') {
                $paidAt = today();
            }
            if ($status !== 'Betald') {
                $paidAt = '';
            }
            $params = [
                post_str('number', 50) ?: null, $customer, post_str('description', 500), $amount, $vat,
                $issued ?: null, $due ?: null, $status, $paidAt ?: null,
            ];
            if ($id > 0) {
                exec_sql('UPDATE invoices SET number=?, customer=?, description=?, amount=?, vat=?, issued=?, due=?, status=?, paid_at=? WHERE id=?', [...$params, $id]);
                flash('ok', 'Fakturan är uppdaterad.');
            } else {
                exec_sql('INSERT INTO invoices (number, customer, description, amount, vat, issued, due, status, paid_at) VALUES (?,?,?,?,?,?,?,?,?)', $params);
                flash('ok', 'Fakturan är tillagd.');
            }
            redirect('fakturor.php');
        }

        if ($action === 'mark_paid' && $id > 0) {
            exec_sql("UPDATE invoices SET status='Betald', paid_at=COALESCE(paid_at, ?) WHERE id=?", [today(), $id]);
            flash('ok', 'Markerad som betald.');
            redirect('fakturor.php' . (isset($_POST['filter']) ? '?status=' . urlencode((string)$_POST['filter']) : ''));
        }

        if ($action === 'mark_sent' && $id > 0) {
            exec_sql("UPDATE invoices SET status='Skickad', issued=COALESCE(issued, ?) WHERE id=?", [today(), $id]);
            flash('ok', 'Markerad som skickad.');
            redirect('fakturor.php');
        }

        if ($action === 'delete_invoice' && $id > 0) {
            exec_sql('DELETE FROM invoices WHERE id=?', [$id]);
            flash('ok', 'Fakturan är raderad.');
            redirect('fakturor.php');
        }
    } catch (InvalidArgumentException $e) {
        flash('error', $e->getMessage());
        redirect('fakturor.php?' . ($id > 0 ? 'edit=' . $id : 'new=1') . '#faktura');
    }
}

// ------------------------------------------------------------------ data
$filter = (string)($_GET['status'] ?? 'Alla');
$filters = ['Alla', 'Utkast', 'Skickad', 'Förfallen', 'Betald', 'Krediterad'];
if (!in_array($filter, $filters, true)) {
    $filter = 'Alla';
}
$all = q('SELECT * FROM invoices ORDER BY COALESCE(issued, DATE(created_at)) DESC, id DESC');
$rows = array_values(array_filter($all, function ($i) use ($filter) {
    if ($filter === 'Alla') {
        return true;
    }
    if ($filter === 'Förfallen') {
        return invoice_overdue($i);
    }
    return $i['status'] === $filter;
}));
$k = invoice_kpis();

$editing = isset($_GET['edit']) ? q1('SELECT * FROM invoices WHERE id = ?', [(int)$_GET['edit']]) : null;
$showForm = $editing || isset($_GET['new']) || !$all;
$f = $editing ?? ['number' => next_invoice_number(), 'vat' => 25.5, 'issued' => today(),
    'due' => date('Y-m-d', strtotime('+14 days')), 'status' => 'Utkast'];

// Fakturerat per kund (betalt + skickat, exkl. moms)
$byCustomer = [];
foreach ($all as $i) {
    if (in_array($i['status'], ['Betald', 'Skickad'], true)) {
        $byCustomer[$i['customer']] = ($byCustomer[$i['customer']] ?? 0) + (float)$i['amount'];
    }
}
arsort($byCustomer);
$customers = array_values(array_unique(array_column($all, 'customer')));
sort($customers);

page_header('Fakturor', 'fakturor');
page_title('Fakturor', 'Vad som ska faktureras, vad som är skickat och vad som är betalt.', '<a class="btn btn-primary" href="fakturor.php?new=1#faktura">+ Ny faktura</a>');
?>

<div class="kpis">
  <?= kpi('Obetalt (skickat)', eur($k['outstanding']), $k['outstanding_count'] . ' st inkl. moms', null, false, 'accent') ?>
  <?= kpi('Förfallet', eur($k['overdue']), $k['overdue_count'] . ' st', null, false, $k['overdue'] > 0 ? 'warn' : '') ?>
  <?= kpi('Betalt denna månad', eur($k['paid_this_month']), 'inkl. moms') ?>
  <?= kpi('Betalt totalt', eur($k['paid']), $k['paid_count'] . ' st') ?>
  <?= kpi('Utkast att skicka', eur($k['draft']), $k['draft_count'] . ' st') ?>
  <?= kpi('Snittid till betalning', $k['avg_days_to_pay'] !== null ? num($k['avg_days_to_pay'], 0) . ' dagar' : '–', 'från fakturadatum') ?>
</div>

<section class="section" id="faktura">
  <div class="section-head">
    <div><h2><?= $editing ? 'Redigera faktura' : 'Ny faktura' ?></h2><p>Belopp anges exklusive moms.</p></div>
    <?php if (!$showForm): ?><a class="btn btn-sm" href="fakturor.php?new=1#faktura">Visa formulär</a><?php endif; ?>
  </div>
  <?php if ($showForm): ?>
  <form method="post" class="section-body">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save_invoice">
    <input type="hidden" name="id" value="<?= (int)($editing['id'] ?? 0) ?>">
    <div class="form-grid">
      <div class="field"><label for="i-number">Fakturanummer</label><input id="i-number" name="number" value="<?= h($f['number'] ?? '') ?>"></div>
      <div class="field"><label for="i-customer">Kund *</label><input id="i-customer" name="customer" list="customer-list" required value="<?= h($f['customer'] ?? '') ?>">
        <datalist id="customer-list"><?php foreach ($customers as $c): ?><option value="<?= h($c) ?>"><?php endforeach; ?></datalist></div>
      <div class="field"><label for="i-amount">Belopp exkl. moms (€)</label><input id="i-amount" name="amount" inputmode="decimal" value="<?= fv($f['amount'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="i-vat">Moms (%)</label><input id="i-vat" name="vat" inputmode="decimal" value="<?= fv($f['vat'] ?? 25.5) ?>"></div>
      <div class="field"><label for="i-issued">Fakturadatum</label><input id="i-issued" name="issued" type="date" value="<?= h($f['issued'] ?? '') ?>"></div>
      <div class="field"><label for="i-due">Förfallodatum</label><input id="i-due" name="due" type="date" value="<?= h($f['due'] ?? '') ?>"></div>
      <div class="field"><label for="i-status">Status</label><select id="i-status" name="status"><?= select_options(INVOICE_STATUSES, $f['status'] ?? 'Utkast') ?></select></div>
      <div class="field"><label for="i-paid">Betaldatum</label><input id="i-paid" name="paid_at" type="date" value="<?= h($f['paid_at'] ?? '') ?>"><small>Sätts till idag om tomt och status är Betald.</small></div>
      <div class="field span-all"><label for="i-desc">Vad faktureras</label><input id="i-desc" name="description" value="<?= h($f['description'] ?? '') ?>"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit"><?= $editing ? 'Spara ändringar' : 'Lägg till faktura' ?></button>
      <a class="btn" href="fakturor.php">Avbryt</a>
    </div>
  </form>
  <?php endif; ?>
</section>

<section class="section">
  <div class="section-head">
    <h2>Alla fakturor</h2>
    <div class="filters">
      <?php foreach ($filters as $fl): ?>
        <a class="chip<?= $fl === $filter ? ' active' : '' ?>" href="fakturor.php<?= $fl === 'Alla' ? '' : '?status=' . urlencode($fl) ?>"><?= h($fl) ?></a>
      <?php endforeach; ?>
    </div>
  </div>
  <div class="section-body flush">
    <?php if (!$rows): ?>
      <?= $all ? empty_state('Inga fakturor matchar filtret', 'Välj ett annat filter ovan.') : empty_state('Inga fakturor', 'Lägg till din första faktura ovan, eller koppla Stripe under Integrationer så kommer betalda fakturor in automatiskt.') ?>
    <?php else: ?>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nr</th><th>Kund</th><th>Fakturadatum</th><th>Förfaller</th><th class="num">Exkl. moms</th><th class="num">Inkl. moms</th><th>Status</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($rows as $i):
            $overdue = invoice_overdue($i); ?>
          <tr>
            <td><?= h($i['number'] ?: '–') ?><?php if ($i['source'] !== 'manuell'): ?><span class="sub"><?= h($i['source']) ?></span><?php endif; ?></td>
            <td><?= h($i['customer']) ?><?php if ($i['description'] !== ''): ?><span class="sub"><?= h($i['description']) ?></span><?php endif; ?></td>
            <td><?= h(date_fi($i['issued'])) ?></td>
            <td class="<?= $overdue ? 'neg' : '' ?>"><?= h(date_fi($i['due'])) ?><?php if ($i['status'] === 'Betald' && $i['paid_at']): ?><span class="sub">betald <?= h(date_fi($i['paid_at'])) ?></span><?php endif; ?></td>
            <td class="num"><?= h(eur2($i['amount'])) ?></td>
            <td class="num"><?= h(eur2(invoice_total($i))) ?></td>
            <td><?= badge($overdue ? 'Förfallen' : $i['status']) ?></td>
            <td class="actions">
              <?php if ($i['status'] === 'Skickad'): ?>
                <form method="post" class="inline-form"><?= csrf_field() ?><input type="hidden" name="action" value="mark_paid"><input type="hidden" name="id" value="<?= (int)$i['id'] ?>"><input type="hidden" name="filter" value="<?= h($filter) ?>"><button class="btn btn-sm" type="submit">Betald</button></form>
              <?php elseif ($i['status'] === 'Utkast'): ?>
                <form method="post" class="inline-form"><?= csrf_field() ?><input type="hidden" name="action" value="mark_sent"><input type="hidden" name="id" value="<?= (int)$i['id'] ?>"><button class="btn btn-sm" type="submit">Skickad</button></form>
              <?php endif; ?>
              <a class="btn-link" href="fakturor.php?edit=<?= (int)$i['id'] ?>#faktura">Redigera</a>
              <form method="post" class="inline-form" data-confirm="Radera faktura <?= h($i['number'] ?: $i['customer']) ?>?"><?= csrf_field() ?><input type="hidden" name="action" value="delete_invoice"><input type="hidden" name="id" value="<?= (int)$i['id'] ?>"><button class="btn-link danger" type="submit">Radera</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>
</section>

<?php if ($byCustomer): ?>
<section class="section">
  <div class="section-head"><div><h2>Fakturerat per kund</h2><p>Skickade och betalda fakturor, exkl. moms</p></div></div>
  <div class="section-body"><?= chart('bycust', [
      'type' => 'bar',
      'labels' => array_keys(array_slice($byCustomer, 0, 10, true)),
      'series' => [['label' => 'Fakturerat', 'data' => array_values(array_slice($byCustomer, 0, 10, true))]],
  ]) ?></div>
</section>
<?php endif; ?>

<?php page_footer();
