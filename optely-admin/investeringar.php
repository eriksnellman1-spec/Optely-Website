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
        if ($action === 'save_holding') {
            $name = post_str('name', 190);
            if ($name === '') {
                throw new InvalidArgumentException('Namn är obligatoriskt.');
            }
            $type = in_array($_POST['type'] ?? '', HOLDING_TYPES, true) ? (string)$_POST['type'] : 'Aktie';
            $value = post_num('value');
            $purchase = post_num('purchase_value');
            $saving = post_num('monthly_saving');
            if ($value < 0 || $purchase < 0 || $saving < 0) {
                throw new InvalidArgumentException('Belopp kan inte vara negativa.');
            }
            $date = post_str('purchase_date', 10);
            if ($date !== '' && !valid_date($date)) {
                throw new InvalidArgumentException('Köpdatum är inte ett giltigt datum.');
            }
            $dupe = q1('SELECT id FROM holdings WHERE name = ? AND id <> ?', [$name, $id]);
            if ($dupe) {
                throw new InvalidArgumentException('Det finns redan ett innehav som heter ' . $name . '.');
            }
            $params = [$name, $type, $value, $purchase, $date ?: null, $saving,
                isset($_POST['illiquid']) ? 1 : 0, post_num('return_pct_override', null), today()];
            if ($id > 0) {
                exec_sql('UPDATE holdings SET name=?, type=?, value=?, purchase_value=?, purchase_date=?, monthly_saving=?, illiquid=?, return_pct_override=?, updated=? WHERE id=?', [...$params, $id]);
                flash('ok', $name . ' uppdaterad.');
            } else {
                exec_sql('INSERT INTO holdings (name, type, value, purchase_value, purchase_date, monthly_saving, illiquid, return_pct_override, updated) VALUES (?,?,?,?,?,?,?,?,?)', $params);
                flash('ok', $name . ' tillagd.');
            }
            redirect('investeringar.php');
        }

        if ($action === 'delete_holding' && $id > 0) {
            exec_sql('DELETE FROM holdings WHERE id=?', [$id]);
            flash('ok', 'Innehavet är raderat.');
            redirect('investeringar.php');
        }

        if ($action === 'bulk_values') {
            $values = (array)($_POST['values'] ?? []);
            $changed = 0;
            db()->beginTransaction();
            foreach ($values as $hid => $raw) {
                $raw = str_replace([' ', NBSP, ','], ['', '', '.'], trim((string)$raw));
                if ($raw === '') {
                    continue;
                }
                if (!is_numeric($raw) || (float)$raw < 0) {
                    db()->rollBack();
                    throw new InvalidArgumentException('Ogiltigt värde: ' . $raw);
                }
                $changed += exec_sql('UPDATE holdings SET value=?, updated=? WHERE id=? AND value <> ?', [(float)$raw, today(), (int)$hid, (float)$raw]);
            }
            db()->commit();
            $msg = $changed . ' innehav uppdaterade.';
            $logMonth = post_str('log_month', 7);
            if (isset($_POST['also_log']) && valid_month($logMonth)) {
                $total = log_portfolio_month($logMonth);
                $msg .= ' Portföljvärdet för ' . month_label($logMonth) . ' loggat: ' . eur($total) . '.';
            }
            flash('ok', $msg);
            redirect('investeringar.php');
        }

        if ($action === 'log_month') {
            $month = post_str('month', 7);
            if (!valid_month($month)) {
                throw new InvalidArgumentException('Välj en månad.');
            }
            $total = log_portfolio_month($month, post_num('total', null));
            flash('ok', 'Portföljvärdet för ' . month_label($month) . ' sparat: ' . eur($total) . '.');
            redirect('investeringar.php#historik');
        }

        if ($action === 'delete_month') {
            exec_sql('DELETE FROM invest_months WHERE month=?', [post_str('month', 7)]);
            flash('ok', 'Månaden är raderad.');
            redirect('investeringar.php#historik');
        }
    } catch (InvalidArgumentException $e) {
        if (db()->inTransaction()) {
            db()->rollBack();
        }
        flash('error', $e->getMessage());
        redirect('investeringar.php' . ($action === 'save_holding' ? '?' . ($id > 0 ? 'edit=' . $id : 'new=1') . '#innehav' : ''));
    }
}

// ------------------------------------------------------------------ data
$p = portfolio();
$typeFilter = in_array($_GET['typ'] ?? '', HOLDING_TYPES, true) ? (string)$_GET['typ'] : 'Alla';
$rows = array_values(array_filter($p['holdings'], fn($h) => $typeFilter === 'Alla' || $h['type'] === $typeFilter));
$editing = isset($_GET['edit']) ? q1('SELECT * FROM holdings WHERE id = ?', [(int)$_GET['edit']]) : null;
$showForm = $editing || isset($_GET['new']) || !$p['holdings'];
$f = $editing ?? ['type' => 'Aktie', 'purchase_date' => today()];

$allocLabels = [];
$allocData = [];
foreach (['Aktie' => 'Aktier', 'Fond' => 'Fonder', 'Fastighet' => 'Fastigheter'] as $t => $label) {
    if (($p['by_type'][$t] ?? 0) > 0) {
        $allocLabels[] = $label;
        $allocData[] = round($p['by_type'][$t], 2);
    }
}

$yearsLabel = $p['portfolio_months'] >= 12
    ? num($p['years']) . ' år'
    : $p['portfolio_months'] . ' mån';

page_header('Investeringar', 'investeringar');
page_title('Investeringar', 'Aktier, fonder och fastigheter – värde, avkastning och utveckling över tid.',
    '<a class="btn" href="#uppdatera">Uppdatera värden</a> <a class="btn btn-primary" href="investeringar.php?new=1#innehav">+ Nytt innehav</a>');
?>

<?php if (!$p['last_in_sync'] && $p['holdings']): ?>
  <div class="flash flash-info">Innehavens värde (<?= h(eur($p['total'])) ?>) skiljer sig från senast loggade månad (<?= h(eur($p['last_logged']['total'])) ?>, <?= h(month_label($p['last_logged']['month'])) ?>). <a href="#historik">Logga månaden</a> för att hålla historiken uppdaterad.</div>
<?php endif; ?>

<div class="kpis">
  <?= kpi('Totalt nuvarande värde', eur($p['total']), $p['illiquid'] > 0 ? 'varav exit-positioner ' . eur($p['illiquid']) : count($p['holdings']) . ' innehav', null, false, 'accent') ?>
  <?= kpi('Totalt insatt kapital', eur($p['invested']), 'köp + månadssparande') ?>
  <?= kpi('Total avkastning', eur($p['unrealized']), '', $p['return_pct']) ?>
  <?= kpi('Senaste månadens förändring', $p['logged_delta'] !== null ? ($p['logged_delta'] >= 0 ? '+' : '') . eur($p['logged_delta']) : '–', $p['last_logged'] ? 'loggat ' . month_short($p['last_logged']['month']) : 'logga minst två månader', $p['logged_pct']) ?>
  <?= kpi('Månadssparande', eur($p['monthly_saving']), eur($p['monthly_saving'] * 12) . ' per år') ?>
  <?= kpi('Prognos om 12 mån', eur($p['forecast12']), 'likvida innehav') ?>
</div>

<section class="section">
  <div class="section-head"><div><h2>Nyckeltal för portföljen</h2><p>Exit-positioner i onoterade bolag räknas inte in i avkastningen.</p></div></div>
  <?php if (!$p['liquid_count']): ?>
    <?= empty_state('Inga nyckeltal ännu', 'Lägg till innehav med köpvärde och köpdatum så räknas nyckeltalen ut automatiskt.') ?>
  <?php else: ?>
  <dl class="stat-list" style="margin:0">
    <div><dt>Årlig avkastning (CAGR)</dt><dd><?= signed_pct($p['cagr']) ?></dd><small><?= $p['cagr'] === null ? 'Behöver minst 6 månaders historik' : 'över ' . h($yearsLabel) ?></small></div>
    <div><dt>Avkastning i procent</dt><dd><?= signed_pct($p['return_pct']) ?></dd><small>på insatt kapital</small></div>
    <div><dt>Avkastningstakt</dt><dd><?= signed_eur($p['month_return']) ?></dd><small>snitt per månad</small></div>
    <div><dt>Portföljens ålder</dt><dd><?= h($yearsLabel) ?></dd><small>äldsta innehavet</small></div>
    <div><dt>Bästa innehav</dt><dd><?= signed_pct($p['best']['return_pct'] ?? null) ?></dd><small><?= h($p['best']['name'] ?? '–') ?></small></div>
    <div><dt>Sämsta innehav</dt><dd><?= signed_pct($p['worst']['return_pct'] ?? null) ?></dd><small><?= h($p['worst']['name'] ?? '–') ?></small></div>
    <div><dt>Största innehav</dt><dd><?= h(eur($p['biggest']['value'] ?? 0)) ?></dd><small><?= h($p['biggest']['name'] ?? '–') ?><?= $p['total'] > 0 && $p['biggest'] ? ' · ' . num((float)$p['biggest']['value'] / $p['total'] * 100) . ' % av portföljen' : '' ?></small></div>
    <div><dt>Innehav i plus</dt><dd><?= $p['winners'] ?> / <?= $p['liquid_count'] ?></dd><small>likvida innehav</small></div>
    <div><dt>Snittvärde per innehav</dt><dd><?= h(eur($p['avg_holding'])) ?></dd><small><?= count($p['holdings']) ?> innehav</small></div>
    <div><dt>Avsatt via månadssparande</dt><dd><?= h(eur($p['saved_via_monthly'])) ?></dd><small>sedan respektive köpdatum</small></div>
  </dl>
  <?php endif; ?>
</section>

<div class="grid-2 stack-20">
  <section class="section">
    <div class="section-head"><h2>Portföljvärde över tid</h2></div>
    <div class="section-body">
      <?php if (count($p['months']) < 1): ?>
        <?= empty_state('Ingen historik ännu', 'Logga portföljvärdet varje månad så växer grafen fram.') ?>
      <?php else: ?>
        <?= chart('pv', [
            'type' => 'line', 'beginAtZero' => false,
            'labels' => array_map(fn($m) => month_short($m['month']), $p['months']),
            'series' => [['label' => 'Portföljvärde', 'data' => array_map(fn($m) => (float)$m['total'], $p['months']), 'fill' => true]],
        ]) ?>
      <?php endif; ?>
    </div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Fördelning</h2></div>
    <div class="section-body">
      <?php if (!$allocData): ?>
        <?= empty_state('Ingen fördelning ännu', 'Lägg till innehav så visas fördelningen per kategori här.') ?>
      <?php else: ?>
        <?= chart('alloc', ['type' => 'doughnut', 'labels' => $allocLabels, 'series' => [['label' => 'Värde', 'data' => $allocData]]]) ?>
      <?php endif; ?>
    </div>
  </section>
</div>

<section class="section" id="innehav">
  <div class="section-head">
    <div><h2><?= $editing ? 'Redigera ' . h($editing['name']) : 'Nytt innehav' ?></h2><p>Avkastning räknas ut från köpvärde och månadssparande sedan köpdatum.</p></div>
    <?php if (!$showForm): ?><a class="btn btn-sm" href="investeringar.php?new=1#innehav">Visa formulär</a><?php endif; ?>
  </div>
  <?php if ($showForm): ?>
  <form method="post" class="section-body">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="save_holding">
    <input type="hidden" name="id" value="<?= (int)($editing['id'] ?? 0) ?>">
    <div class="form-grid">
      <div class="field"><label for="h-name">Namn *</label><input id="h-name" name="name" required value="<?= h($f['name'] ?? '') ?>"></div>
      <div class="field"><label for="h-type">Typ</label><select id="h-type" name="type"><?= select_options(HOLDING_TYPES, $f['type'] ?? 'Aktie') ?></select></div>
      <div class="field"><label for="h-value">Nuvarande värde (€)</label><input id="h-value" name="value" inputmode="decimal" value="<?= fv($f['value'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="h-purchase">Köpvärde (€)</label><input id="h-purchase" name="purchase_value" inputmode="decimal" value="<?= fv($f['purchase_value'] ?? null) ?>" placeholder="0"></div>
      <div class="field"><label for="h-date">Köpdatum</label><input id="h-date" name="purchase_date" type="date" value="<?= h($f['purchase_date'] ?? '') ?>"></div>
      <div class="field"><label for="h-saving">Månadssparande (€/mån)</label><input id="h-saving" name="monthly_saving" inputmode="decimal" value="<?= fv($f['monthly_saving'] ?? null, true) ?>" placeholder="0"></div>
      <div class="field"><label for="h-override">Avkastning % (manuellt)</label><input id="h-override" name="return_pct_override" inputmode="decimal" value="<?= fv($f['return_pct_override'] ?? null) ?>" placeholder="Räknas ut automatiskt"><small>Fyll bara i om du vill ersätta den uträknade.</small></div>
      <div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" name="illiquid" value="1"<?= !empty($f['illiquid']) ? ' checked' : '' ?>> Exit-position (onoterat, ingen rörlig kurs)</label></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit"><?= $editing ? 'Spara ändringar' : 'Lägg till innehav' ?></button>
      <a class="btn" href="investeringar.php">Avbryt</a>
    </div>
  </form>
  <?php endif; ?>
</section>

<section class="section">
  <div class="section-head">
    <h2>Innehav</h2>
    <div class="filters">
      <?php foreach (array_merge(['Alla'], HOLDING_TYPES) as $t): ?>
        <a class="chip<?= $t === $typeFilter ? ' active' : '' ?>" href="investeringar.php<?= $t === 'Alla' ? '' : '?typ=' . urlencode($t) ?>"><?= h($t) ?></a>
      <?php endforeach; ?>
    </div>
  </div>
  <div class="section-body flush">
    <?php if (!$rows): ?>
      <?= $p['holdings'] ? empty_state('Inga innehav av den typen', 'Välj ett annat filter.') : empty_state('Inga innehav ännu', 'Lägg till ditt första innehav ovan eller importera från Lovable under Integrationer.') ?>
    <?php else: ?>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Namn</th><th>Typ</th><th class="num">Värde</th><th class="num">Insatt</th><th class="num">Avkastning</th><th class="num">%</th><th class="num">Sparande</th><th class="num">Andel</th><th>Uppdaterad</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($rows as $hd): ?>
          <tr>
            <td><?= h($hd['name']) ?><?php if ($hd['illiquid_calc']): ?><span class="sub">exit-position</span><?php endif; ?><?php if ($hd['return_pct_override'] !== null): ?><span class="sub">manuell avkastning</span><?php endif; ?></td>
            <td><?= badge($hd['type']) ?></td>
            <td class="num"><?= h(eur($hd['value'])) ?></td>
            <td class="num"><?= $hd['illiquid_calc'] ? '<span class="muted">–</span>' : h(eur($hd['invested'])) ?></td>
            <td class="num"><?= $hd['illiquid_calc'] ? '<span class="muted">–</span>' : signed_eur($hd['unrealized']) ?></td>
            <td class="num"><?= $hd['illiquid_calc'] ? '<span class="muted">–</span>' : signed_pct($hd['return_pct']) ?></td>
            <td class="num"><?= (float)$hd['monthly_saving'] > 0 ? h(eur($hd['monthly_saving'])) . '/mån' : '<span class="muted">–</span>' ?></td>
            <td class="num"><?= $p['total'] > 0 ? h(num((float)$hd['value'] / $p['total'] * 100)) . NBSP . '%' : '–' ?></td>
            <td><?= h(date_fi($hd['updated'])) ?></td>
            <td class="actions">
              <a class="btn-link" href="investeringar.php?edit=<?= (int)$hd['id'] ?>#innehav">Redigera</a>
              <form method="post" class="inline-form" data-confirm="Radera <?= h($hd['name']) ?>?"><?= csrf_field() ?><input type="hidden" name="action" value="delete_holding"><input type="hidden" name="id" value="<?= (int)$hd['id'] ?>"><button class="btn-link danger" type="submit">Radera</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>
</section>

<?php if ($p['holdings']): ?>
<section class="section" id="uppdatera">
  <div class="section-head"><div><h2>Uppdatera värden</h2><p>Din månadsrutin: skriv in dagens värden och logga portföljvärdet i samma steg.</p></div></div>
  <form method="post" class="section-body">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="bulk_values">
    <div class="form-grid">
      <?php foreach ($p['holdings'] as $hd): ?>
        <div class="field">
          <label for="v-<?= (int)$hd['id'] ?>"><?= h($hd['name']) ?></label>
          <input id="v-<?= (int)$hd['id'] ?>" name="values[<?= (int)$hd['id'] ?>]" inputmode="decimal" value="<?= fv($hd['value']) ?>">
        </div>
      <?php endforeach; ?>
    </div>
    <div class="form-actions">
      <label class="check"><input type="checkbox" name="also_log" value="1" checked> Logga även som portföljvärde för</label>
      <select name="log_month" style="width:auto"><?= select_options(month_options(), this_month(), 'month_label') ?></select>
      <button class="btn btn-primary" type="submit">Spara värden</button>
    </div>
  </form>
</section>
<?php endif; ?>

<section class="section" id="historik">
  <div class="section-head"><div><h2>Portföljvärde per månad</h2><p>Oberoende av enskilda innehav, så utvecklingen syns även om innehav läggs till eller tas bort.</p></div></div>
  <form method="post" class="section-body">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="log_month">
    <div class="form-grid">
      <div class="field"><label for="lm-month">Månad</label><select id="lm-month" name="month"><?= select_options(month_options(), this_month(), 'month_label') ?></select></div>
      <div class="field"><label for="lm-total">Totalt värde (€)</label><input id="lm-total" name="total" inputmode="decimal" placeholder="<?= h(fv($p['total'])) ?> (nuvarande innehav)"><small>Lämna tomt för att använda innehavens nuvarande värde.</small></div>
    </div>
    <div class="form-actions"><button class="btn btn-primary" type="submit">Logga månad</button></div>
  </form>
  <div class="section-body flush">
    <?php if (!$p['months']): ?>
      <?= empty_state('Ingen månad loggad ännu', 'Logga portföljvärdet ovan.') ?>
    <?php else: ?>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Månad</th><th class="num">Portföljvärde</th><th class="num">Förändring</th><th class="num">%</th><th>Innehav vid tillfället</th><th></th></tr></thead>
        <tbody>
        <?php
        $months = $p['months'];
        for ($i = count($months) - 1; $i >= 0; $i--):
            $m = $months[$i];
            $prev = $i > 0 ? (float)$months[$i - 1]['total'] : null;
            $delta = $prev !== null ? (float)$m['total'] - $prev : null;
            $snap = json_decode((string)$m['snapshot'], true) ?: []; ?>
          <tr>
            <td><?= h(ucfirst(month_label($m['month']))) ?></td>
            <td class="num"><?= h(eur($m['total'])) ?></td>
            <td class="num"><?= $delta !== null ? signed_eur($delta) : '<span class="muted">–</span>' ?></td>
            <td class="num"><?= signed_pct(change_pct((float)$m['total'], $prev)) ?></td>
            <td class="note-cell"><?= $snap ? h(implode(', ', array_map(fn($s) => $s['name'] . ' ' . eur($s['value']), array_slice($snap, 0, 6)))) . (count($snap) > 6 ? ' …' : '') : '<span class="muted">–</span>' ?></td>
            <td class="actions">
              <form method="post" class="inline-form" data-confirm="Radera <?= h(month_label($m['month'])) ?>?"><?= csrf_field() ?><input type="hidden" name="action" value="delete_month"><input type="hidden" name="month" value="<?= h($m['month']) ?>"><button class="btn-link danger" type="submit">Radera</button></form>
            </td>
          </tr>
        <?php endfor; ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>
</section>

<?php page_footer();
