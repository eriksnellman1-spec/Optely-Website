<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/layout.php';
require_login();

function int_or_null(string $v): ?int
{
    $d = preg_replace('/\D/', '', $v);
    return $d === '' ? null : (int) $d;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_post();
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);

    if ($action === 'add') {
        $name = post('name');
        if ($name === '') {
            flash('Skriv kundens namn.', 'error');
            redirect('kunder.php');
        }
        q("INSERT INTO companies (name, contact_name, phone, status, source, created_at, updated_at) VALUES (?, ?, ?, 'kund', 'manuell', ?, ?)",
            [$name, nullable(post('contact_name')), nullable(post('phone')), now(), now()]);
        $id = (int) db()->lastInsertId();
        q('INSERT INTO customers (company_id, project, value_eur, monthly_eur, started_on, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [$id, nullable(post('project')), int_or_null(post('value_eur')), int_or_null(post('monthly_eur')), today(), now()]);
        flash("$name är tillagd som kund.");
        redirect('kunder.php');
    }

    if ($action === 'save' && $id) {
        q('INSERT INTO customers (company_id, project, value_eur, monthly_eur, invoiced, maintenance, active, note, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE project = VALUES(project), value_eur = VALUES(value_eur), monthly_eur = VALUES(monthly_eur),
             invoiced = VALUES(invoiced), maintenance = VALUES(maintenance), active = VALUES(active), note = VALUES(note), updated_at = VALUES(updated_at)',
            [$id, nullable(post('project')), int_or_null(post('value_eur')), int_or_null(post('monthly_eur')),
                post('invoiced') === '1' ? 1 : 0, post('maintenance') === '1' ? 1 : 0, post('active') === '1' ? 1 : 0, nullable(post('note')), now()]);
        flash('Sparat.');
        redirect('kunder.php#k' . $id);
    }
    redirect('kunder.php');
}

$rows = q("SELECT c.id, c.name, c.contact_name, c.phone, cu.project, cu.value_eur, cu.monthly_eur, cu.invoiced, cu.maintenance,
                  COALESCE(cu.active, 1) AS active, cu.started_on, cu.note
             FROM companies c LEFT JOIN customers cu ON cu.company_id = c.id
            WHERE c.status = 'kund'
            ORDER BY COALESCE(cu.active, 1) DESC, c.name")->fetchAll();
$active = array_filter($rows, fn ($r) => (int) $r['active'] === 1);
$mrr = array_sum(array_map(fn ($r) => (int) $r['monthly_eur'], $active));
$notInvoiced = count(array_filter($active, fn ($r) => !(int) $r['invoiced'] && (int) $r['value_eur'] > 0));

page_start('Kunder', 'kunder.php');
?>
<div class="page-head">
  <h1>Kunder</h1>
  <p class="muted"><strong><?= count($active) ?></strong> aktiva · <strong><?= e(fmt_eur($mrr)) ?></strong> per månad · <strong><?= $notInvoiced ?></strong> ej fakturerade</p>
</div>

<details class="card">
  <summary><strong>Lägg till kund</strong></summary>
  <form method="post" class="form-grid">
    <?= csrf_field() ?><input type="hidden" name="action" value="add">
    <label>Företag * <input name="name" required></label>
    <label>Kontaktperson <input name="contact_name"></label>
    <label>Telefon <input name="phone" type="tel"></label>
    <label>Projekt <input name="project"></label>
    <label>Engångsbelopp (€) <input name="value_eur" inputmode="numeric"></label>
    <label>Per månad (€) <input name="monthly_eur" inputmode="numeric"></label>
    <div class="span-2 actions"><button class="btn btn-primary">Lägg till</button></div>
  </form>
</details>

<?php if (!$rows): ?>
  <section class="card empty"><h2>Inga kunder än</h2><p class="muted">Kunder kommer hit när ett möte i Idag blir "Blev kund", eller när du lägger till en ovan.</p></section>
<?php else: ?>
  <?php foreach ($rows as $r): ?>
  <form method="post" class="card customer <?= (int) $r['active'] ? '' : 'dim' ?>" id="k<?= (int) $r['id'] ?>">
    <?= csrf_field() ?><input type="hidden" name="action" value="save"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
    <div class="row">
      <div class="grow">
        <a href="foretag.php?id=<?= (int) $r['id'] ?>"><strong><?= e($r['name']) ?></strong></a>
        <span class="muted small"><?= e(implode(' · ', array_filter([$r['contact_name'], $r['phone'], $r['started_on'] ? 'sedan ' . fmt_date($r['started_on']) : null]))) ?></span>
      </div>
      <?php if (!(int) $r['active']): ?><span class="badge badge-gray">Inte aktiv</span><?php endif; ?>
    </div>
    <div class="form-grid cols-4">
      <label class="span-2">Projekt <input name="project" value="<?= e($r['project']) ?>"></label>
      <label>Engång (€) <input name="value_eur" inputmode="numeric" value="<?= e($r['value_eur'] === null ? '' : (string) $r['value_eur']) ?>"></label>
      <label>Per månad (€) <input name="monthly_eur" inputmode="numeric" value="<?= e($r['monthly_eur'] === null ? '' : (string) $r['monthly_eur']) ?>"></label>
      <label class="span-4">Anteckning <input name="note" value="<?= e($r['note']) ?>"></label>
    </div>
    <div class="row wrap">
      <label class="check"><input type="checkbox" name="invoiced" value="1" <?= (int) $r['invoiced'] ? 'checked' : '' ?>> Fakturerat</label>
      <label class="check"><input type="checkbox" name="maintenance" value="1" <?= (int) $r['maintenance'] ? 'checked' : '' ?>> Driftsavtal</label>
      <label class="check"><input type="checkbox" name="active" value="1" <?= (int) $r['active'] ? 'checked' : '' ?>> Aktiv</label>
      <button class="btn btn-small push-right">Spara</button>
    </div>
  </form>
  <?php endforeach; ?>
<?php endif;
page_end();
