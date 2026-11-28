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
    try {
        if ($action === 'save_month') {
            $month = post_str('month', 7);
            $originalMonth = post_str('original_month', 7);
            if (!valid_month($month)) {
                throw new InvalidArgumentException('Välj en månad.');
            }
            $data = [
                'revenue'   => post_num('revenue'),
                'mrr'       => post_num('mrr'),
                'one_off'   => post_num('one_off'),
                'costs'     => post_num('costs'),
                'customers' => post_num('customers'),
                'leads'     => post_num('leads'),
                'hours'     => post_num('hours'),
            ];
            foreach (['mrr', 'one_off', 'costs', 'customers', 'leads', 'hours'] as $k) {
                if ($data[$k] < 0) {
                    throw new InvalidArgumentException('Endast fakturerat totalt får vara negativt (minusmånad).');
                }
            }
            $cumRev = post_num('cum_revenue_override', null);
            $cumNet = post_num('cum_net_override', null);
            $note = post_str('note', 2000);

            $existing = q1('SELECT id FROM months WHERE month = ?', [$month]);
            if ($originalMonth !== '' && $originalMonth !== $month && $existing) {
                throw new InvalidArgumentException('Det finns redan en post för ' . month_label($month) . '. Redigera den i stället.');
            }
            if ($originalMonth === '' && $existing) {
                throw new InvalidArgumentException('Det finns redan en post för ' . month_label($month) . '. Redigera den i stället.');
            }

            $params = [$month, $data['revenue'], $data['mrr'], $data['one_off'], $data['costs'],
                (int)$data['customers'], (int)$data['leads'], $data['hours'], $note, $cumRev, $cumNet];
            if ($originalMonth !== '') {
                exec_sql('UPDATE months SET month=?, revenue=?, mrr=?, one_off=?, costs=?, customers=?, leads=?, hours=?, note=?,
                          cum_revenue_override=?, cum_net_override=? WHERE month=?', [...$params, $originalMonth]);
            } else {
                exec_sql('INSERT INTO months (month, revenue, mrr, one_off, costs, customers, leads, hours, note,
                          cum_revenue_override, cum_net_override) VALUES (?,?,?,?,?,?,?,?,?,?,?)', $params);
            }
            flash('ok', month_label($month) . ' sparad.');
            redirect('index.php?m=' . urlencode($month));
        }

        if ($action === 'delete_month') {
            $month = post_str('month', 7);
            exec_sql('DELETE FROM months WHERE month = ?', [$month]);
            flash('ok', month_label($month) . ' raderad.');
            redirect('index.php');
        }
    } catch (InvalidArgumentException $e) {
        flash('error', $e->getMessage());
        $back = 'index.php' . (isset($_POST['original_month']) && $_POST['original_month'] !== ''
            ? '?edit=' . urlencode((string)$_POST['original_month']) : '?new=1');
        redirect($back . '#manad');
    }
}

// ------------------------------------------------------------------ data
$series = economy_series();
$selected = isset($_GET['m']) && valid_month((string)$_GET['m']) ? (string)$_GET['m'] : null;
$k = economy_kpis($series, $selected);
$inv = invoice_kpis();

$editMonth = isset($_GET['edit']) ? q1('SELECT * FROM months WHERE month = ?', [(string)$_GET['edit']]) : null;
$existingMonths = array_column($series, 'month');
$suggestMonth = this_month();
if (in_array($suggestMonth, $existingMonths, true)) {
    $suggestMonth = '';
}

$labels = array_map(fn($r) => month_short($r['month']), $series);

page_header('Ekonomi', 'ekonomi');

$monthPicker = '';
if ($series) {
    $monthPicker = '<form method="get" class="month-pick"><label for="m" class="muted">Månad</label><select id="m" name="m" data-autosubmit>'
        . select_options(array_reverse($existingMonths), $k['month'], 'month_label')
        . '</select><noscript><button class="btn btn-sm">Visa</button></noscript></form>';
}
page_title('Ekonomi', 'Omsättning, resultat och tillväxt för Optely månad för månad.', $monthPicker . ' <a class="btn btn-primary" href="index.php?new=1#manad">+ Ny månad</a>');
?>

<?php if (!$k): ?>
  <section class="section">
    <?= empty_state('Ingen månadsdata ännu', 'Lägg till din första månad i formuläret nedan, importera från Lovable under Integrationer eller skicka in data via API:t.') ?>
  </section>
<?php else: ?>
  <div class="kpis">
    <?= kpi('Omsättning ' . month_short($k['month']), eur($k['revenue']), $k['prev_month'] ? 'mot ' . month_short($k['prev_month']) : '', $k['revenue_change'], false, 'accent') ?>
    <?= kpi('MRR', eur($k['mrr']), 'ARR ' . eur($k['arr']), $k['mrr_change']) ?>
    <?= kpi('Nettoresultat', eur($k['net']), $k['margin'] !== null ? 'marginal ' . num($k['margin']) . ' %' : 'kostnader ' . eur($k['costs']), $k['net_change'], false, $k['net'] < 0 ? 'warn' : '') ?>
    <?= kpi('Betalande kunder', (string)$k['customers'], $k['customers_delta'] !== null ? (($k['customers_delta'] > 0 ? '+' : '') . $k['customers_delta'] . ' mot förra månaden') : '') ?>
    <?= kpi('Kumulativ omsättning', eur($k['cum_revenue']), 'sedan start') ?>
    <?= kpi('Kumulativt resultat', eur($k['cum_net']), 'sedan start', null, false, $k['cum_net'] < 0 ? 'warn' : '') ?>
  </div>

  <section class="section">
    <dl class="stat-list" style="margin:0">
      <div><dt>Hittills i år</dt><dd><?= h(eur($k['ytd_revenue'])) ?></dd><small>resultat <?= h(eur($k['ytd_net'])) ?></small></div>
      <div><dt>Snitt senaste 3 mån</dt><dd><?= h(eur($k['avg3_revenue'])) ?></dd><small>omsättning per månad</small></div>
      <div><dt>Effektivt timpris</dt><dd><?= $k['hourly_rate'] !== null ? h(eur($k['hourly_rate'])) : '–' ?></dd><small><?= $k['hours'] > 0 ? h(num($k['hours'])) . ' h denna månad' : 'logga timmar för att se' ?><?= $k['ytd_hourly_rate'] !== null ? ' · i år ' . h(eur($k['ytd_hourly_rate'])) : '' ?></small></div>
      <div><dt>Intäkt per kund</dt><dd><?= $k['arpc'] !== null ? h(eur($k['arpc'])) : '–' ?></dd><small>vald månad</small></div>
      <div><dt>Engångsintäkter</dt><dd><?= h(eur($k['one_off'])) ?></dd><small><?= $k['revenue'] > 0 ? h(num($k['mrr'] / $k['revenue'] * 100)) . ' % av omsättningen är löpande' : '–' ?></small></div>
      <div><dt>Nya leads</dt><dd><?= h((string)$k['leads']) ?></dd><small>vald månad</small></div>
      <div><dt>Obetalda fakturor</dt><dd><a href="fakturor.php?status=Skickad"><?= h(eur($inv['outstanding'])) ?></a></dd><small><?= $inv['outstanding_count'] ?> st inkl. moms</small></div>
      <div><dt>Förfallet</dt><dd class="<?= $inv['overdue'] > 0 ? 'neg' : '' ?>"><?= h(eur($inv['overdue'])) ?></dd><small><?= $inv['overdue_count'] ?> st</small></div>
    </dl>
    <?php if ($k['note'] !== ''): ?>
      <div class="section-body"><div class="callout"><strong><?= h(ucfirst(month_label($k['month']))) ?>:</strong> <?= nl2br(h($k['note'])) ?></div></div>
    <?php endif; ?>
  </section>

  <div class="grid-2 stack-20">
    <section class="section">
      <div class="section-head"><h2>Omsättning och resultat per månad</h2></div>
      <div class="section-body"><?= chart('rev', [
          'type' => 'bar', 'labels' => $labels,
          'series' => [
              ['label' => 'Omsättning', 'data' => array_column($series, 'revenue')],
              ['label' => 'Resultat', 'data' => array_column($series, 'net'), 'color' => 1],
          ],
      ]) ?></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Kumulativ omsättning och resultat</h2></div>
      <div class="section-body"><?= chart('cum', [
          'type' => 'line', 'labels' => $labels, 'beginAtZero' => false,
          'series' => [
              ['label' => 'Kumulativ omsättning', 'data' => array_column($series, 'cum_revenue'), 'fill' => true],
              ['label' => 'Kumulativt resultat', 'data' => array_column($series, 'cum_net'), 'color' => 1],
          ],
      ]) ?></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Intäktsmix</h2><p>Löpande (MRR) mot engångsintäkter</p></div>
      <div class="section-body"><?= chart('mix', [
          'type' => 'bar', 'labels' => $labels,
          'series' => [
              ['label' => 'MRR', 'data' => array_column($series, 'mrr')],
              ['label' => 'Engångsintäkter', 'data' => array_column($series, 'one_off'), 'color' => 2],
          ],
      ]) ?></div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Betalande kunder över tid</h2></div>
      <div class="section-body"><?= chart('cust', [
          'type' => 'line', 'labels' => $labels, 'format' => 'number',
          'series' => [['label' => 'Betalande kunder', 'data' => array_column($series, 'customers'), 'fill' => true]],
      ]) ?></div>
    </section>
  </div>
<?php endif; ?>

<?php
$showForm = $editMonth || isset($_GET['new']) || !$series;
$f = $editMonth ?? ['month' => $suggestMonth];
?>
<section class="section" id="manad">
  <div class="section-head">
    <div>
      <h2><?= $editMonth ? 'Redigera ' . h(month_label($editMonth['month'])) : 'Lägg till månad' ?></h2>
      <p>En post per månad. Endast fakturerat totalt får vara negativt.</p>
    </div>
    <?php if (!$showForm): ?><a class="btn btn-sm" href="index.php?new=1#manad">Visa formulär</a><?php endif; ?>
  </div>
  <?php if ($showForm): ?>
  <form method="post" class="section-body">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save_month">
    <input type="hidden" name="original_month" value="<?= h($editMonth['month'] ?? '') ?>">
    <div class="form-grid">
      <div class="field">
        <label for="f-month">Månad *</label>
        <select id="f-month" name="month" required>
          <option value="">Välj månad</option>
          <?php foreach (month_options() as $mo):
              $taken = in_array($mo, $existingMonths, true) && $mo !== ($editMonth['month'] ?? null); ?>
            <option value="<?= h($mo) ?>"<?= $mo === ($f['month'] ?? '') ? ' selected' : '' ?><?= $taken ? ' disabled' : '' ?>>
              <?= h(month_label($mo)) ?><?= $taken ? ' (finns)' : '' ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="field"><label for="f-revenue">Fakturerat totalt (€)</label><input id="f-revenue" name="revenue" inputmode="decimal" value="<?= fv($f['revenue'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="f-mrr">Löpande intäkter / MRR (€)</label><input id="f-mrr" name="mrr" inputmode="decimal" value="<?= fv($f['mrr'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="f-oneoff">Engångsintäkter (€)</label><input id="f-oneoff" name="one_off" inputmode="decimal" value="<?= fv($f['one_off'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="f-costs">Kostnader (€)</label><input id="f-costs" name="costs" inputmode="decimal" value="<?= fv($f['costs'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="f-customers">Betalande kunder</label><input id="f-customers" name="customers" type="number" min="0" step="1" value="<?= fv($f['customers'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="f-leads">Nya leads</label><input id="f-leads" name="leads" type="number" min="0" step="1" value="<?= fv($f['leads'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="f-hours">Nedlagd tid (timmar)</label><input id="f-hours" name="hours" inputmode="decimal" value="<?= fv($f['hours'] ?? null) ?>" placeholder="0"></div>
      <div class="field span-all"><label for="f-note">Anteckning om månaden</label><textarea id="f-note" name="note" placeholder="Vad hände den här månaden?"><?= h($f['note'] ?? '') ?></textarea></div>
      <details class="span-all"<?= ($f['cum_revenue_override'] ?? null) !== null || ($f['cum_net_override'] ?? null) !== null ? ' open' : '' ?>>
        <summary>Fasta kumulativa värden (valfritt)</summary>
        <p class="muted" style="margin:8px 0 12px">Används om du vill starta kumulativa summor från ett känt värde. Senare månader räknas vidare härifrån. Lämna tomt för att räkna automatiskt.</p>
        <div class="form-grid">
          <div class="field"><label for="f-cumrev">Kumulativ omsättning (€)</label><input id="f-cumrev" name="cum_revenue_override" inputmode="decimal" value="<?= fv($f['cum_revenue_override'] ?? null) ?>"></div>
          <div class="field"><label for="f-cumnet">Kumulativt resultat (€)</label><input id="f-cumnet" name="cum_net_override" inputmode="decimal" value="<?= fv($f['cum_net_override'] ?? null) ?>"></div>
        </div>
      </details>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit"><?= $editMonth ? 'Spara ändringar' : 'Lägg till månad' ?></button>
      <a class="btn" href="index.php">Avbryt</a>
    </div>
  </form>
  <?php endif; ?>
</section>

<section class="section">
  <div class="section-head">
    <div><h2>Månadshistorik</h2><p>Kolumnen ”Betalda fakturor” visar vad fakturorna säger, så att du kan stämma av mot det du loggat.</p></div>
  </div>
  <div class="section-body flush">
    <?php if (!$series): ?>
      <?= empty_state('Ingen historik ännu', 'Månader du lägger till visas här, nyaste först.') ?>
    <?php else: ?>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Månad</th><th class="num">Omsättning</th><th class="num">MRR</th><th class="num">Engång</th>
          <th class="num">Kostnader</th><th class="num">Resultat</th><th class="num">Kunder</th><th class="num">Leads</th>
          <th class="num">Timmar</th><th class="num">Betalda fakturor</th><th>Anteckning</th><th></th>
        </tr></thead>
        <tbody>
        <?php foreach (array_reverse($series) as $r):
            $diff = $r['paid_invoices'] - $r['revenue']; ?>
          <tr class="<?= $r['month'] === $k['month'] ? 'is-selected' : '' ?>">
            <td><a href="index.php?m=<?= h($r['month']) ?>"><?= h(ucfirst(month_label($r['month']))) ?></a></td>
            <td class="num"><?= h(eur($r['revenue'])) ?></td>
            <td class="num"><?= h(eur($r['mrr'])) ?></td>
            <td class="num"><?= h(eur($r['one_off'])) ?></td>
            <td class="num"><?= h(eur($r['costs'])) ?></td>
            <td class="num"><?= signed_eur($r['net']) ?></td>
            <td class="num"><?= h((string)$r['customers']) ?></td>
            <td class="num"><?= h((string)$r['leads']) ?></td>
            <td class="num"><?= h(num($r['hours'])) ?></td>
            <td class="num"><?= h(eur($r['paid_invoices'])) ?><?php if (abs($diff) >= 1 && $r['paid_invoices'] > 0): ?><span class="sub <?= $diff > 0 ? 'pos' : 'neg' ?>"><?= $diff > 0 ? '+' : '' ?><?= h(eur($diff)) ?></span><?php endif; ?></td>
            <td class="note-cell"><?= h(mb_strimwidth((string)$r['note'], 0, 90, '…')) ?></td>
            <td class="actions">
              <a class="btn-link" href="index.php?edit=<?= h($r['month']) ?>#manad">Redigera</a>
              <form method="post" class="inline-form" data-confirm="Radera <?= h(month_label($r['month'])) ?>?">
                <?= csrf_field() ?><input type="hidden" name="action" value="delete_month"><input type="hidden" name="month" value="<?= h($r['month']) ?>">
                <button class="btn-link danger" type="submit">Radera</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>
</section>

<?php page_footer();
