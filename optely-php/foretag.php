<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/layout.php';
require __DIR__ . '/app/calls.php';
require_login();

const FIELDS = [
    'name' => 'Företagsnamn', 'contact_name' => 'Kontaktperson', 'contact_role' => 'Roll', 'phone' => 'Telefon',
    'email' => 'E-post', 'industry' => 'Bransch', 'city' => 'Ort', 'website' => 'Webb', 'org_nr' => 'FO-nummer',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_post();
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);

    if ($action === 'save') {
        $data = [];
        foreach (array_keys(FIELDS) as $f) {
            $data[$f] = nullable(post($f));
        }
        $data['notes'] = nullable(post('notes'));
        if ($data['name'] === null) {
            flash('Företagsnamn krävs.', 'error');
            redirect($id ? "foretag.php?id=$id" : 'foretag.php?ny=1');
        }
        if ($id) {
            $sets = implode(', ', array_map(fn ($k) => "$k = ?", array_keys($data)));
            q("UPDATE companies SET $sets, updated_at = ? WHERE id = ?", [...array_values($data), now(), $id]);
            flash('Sparat.');
        } else {
            $status = post('queue_now') === '1' ? 'ko' : 'ny';
            $cols = implode(', ', array_keys($data));
            $marks = implode(', ', array_fill(0, count($data), '?'));
            q("INSERT INTO companies ($cols, status, next_call_at, released_on, source, created_at, updated_at)
               VALUES ($marks, ?, ?, ?, 'manuell', ?, ?)",
                [...array_values($data), $status, $status === 'ko' ? first_in_queue() : null, $status === 'ko' ? today() : null, now(), now()]);
            $id = (int) db()->lastInsertId();
            flash($status === 'ko' ? 'Bolaget är tillagt och ligger först i dagens kö.' : 'Bolaget är tillagt.');
        }
        redirect("foretag.php?id=$id");
    }

    if ($action === 'queue_now' && $id) {
        q("UPDATE companies SET status = 'ko', attempts = 0, next_call_at = ?, released_on = COALESCE(released_on, ?), updated_at = ? WHERE id = ?",
            [first_in_queue(), today(), now(), $id]);
        flash('Bolaget ligger nu först i dagens kö.');
        redirect("idag.php?id=$id");
    }

    if ($action === 'delete' && $id) {
        q('DELETE FROM companies WHERE id = ?', [$id]);
        flash('Bolaget är raderat.');
        redirect('foretag.php');
    }

    if ($action === 'delete_selected') {
        $ids = array_values(array_filter(array_map('intval', (array) ($_POST['ids'] ?? []))));
        if ($ids) {
            q('DELETE FROM companies WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')', $ids);
        }
        flash(count($ids) . ' bolag raderade.');
        redirect('foretag.php');
    }

    if ($action === 'delete_all') {
        if (post('confirm') !== 'RADERA') {
            flash('Skriv RADERA för att radera alla.', 'error');
            redirect('foretag.php');
        }
        $n = q('DELETE FROM companies')->rowCount();
        flash("$n bolag raderade.");
        redirect('foretag.php');
    }
    redirect('foretag.php');
}

// ---------- Ett bolag (redigera) eller nytt ----------
if (isset($_GET['id']) || isset($_GET['ny'])) {
    $c = isset($_GET['id']) ? company((int) $_GET['id']) : null;
    if (isset($_GET['id']) && !$c) {
        flash('Bolaget finns inte.', 'error');
        redirect('foretag.php');
    }
    $history = $c ? call_history((int) $c['id']) : [];
    page_start($c ? $c['name'] : 'Nytt bolag', 'foretag.php');
    ?>
    <p><a href="foretag.php" class="small">← Företag</a></p>
    <div class="page-head">
      <h1><?= e($c['name'] ?? 'Nytt bolag') ?></h1>
      <?php if ($c): ?><p><?= status_badge($c['status']) ?>
        <?php if ($c['next_call_at'] && in_array($c['status'], ['ko', 'ring_senare'], true)): ?><span class="muted"> · ring <?= e(fmt_datetime($c['next_call_at'])) ?></span><?php endif; ?>
        <?php if ($c['meeting_at'] && $c['status'] === 'mote_bokat'): ?><span class="muted"> · möte <?= e(fmt_datetime($c['meeting_at'])) ?></span><?php endif; ?>
      </p><?php endif; ?>
    </div>
    <div class="split split-wide">
      <form method="post" class="card form-grid">
        <?= csrf_field() ?><input type="hidden" name="action" value="save"><input type="hidden" name="id" value="<?= (int) ($c['id'] ?? 0) ?>">
        <?php foreach (FIELDS as $f => $label): ?>
          <label><?= e($label) ?><?= $f === 'name' ? ' *' : '' ?>
            <input name="<?= $f ?>" value="<?= e($c[$f] ?? '') ?>" <?= $f === 'name' ? 'required' : '' ?> <?= $f === 'phone' ? 'type="tel"' : '' ?> <?= $f === 'email' ? 'type="email"' : '' ?>>
          </label>
        <?php endforeach; ?>
        <label class="span-2">Anteckning <textarea name="notes" rows="3"><?= e($c['notes'] ?? '') ?></textarea></label>
        <?php if (!$c): ?>
          <label class="check span-2"><input type="checkbox" name="queue_now" value="1" checked> Lägg först i dagens ringkö</label>
        <?php endif; ?>
        <div class="span-2 actions"><button class="btn btn-primary">Spara</button></div>
      </form>
      <?php if ($c): ?>
      <div class="stack">
        <section class="card">
          <h2>Ringkön</h2>
          <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="queue_now"><input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
            <button class="btn">Ring nu – lägg först i dagens kö</button></form>
        </section>
        <section class="card">
          <h2>Historik</h2>
          <?php if (!$history): ?><p class="muted">Inga samtal än.</p><?php else: ?>
          <ul class="history"><?php foreach ($history as $h): ?>
            <li><span class="muted small"><?= e(fmt_datetime($h['created_at'])) ?></span> <?= e(OUTCOME[$h['outcome']] ?? $h['outcome']) ?><?php if ($h['note']): ?> – <?= e($h['note']) ?><?php endif; ?></li>
          <?php endforeach; ?></ul>
          <?php endif; ?>
        </section>
        <form method="post" class="card" onsubmit="return confirm('Radera <?= e(addslashes($c['name'])) ?> och all historik?')">
          <?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int) $c['id'] ?>">
          <button class="link danger">Radera bolaget</button>
        </form>
      </div>
      <?php endif; ?>
    </div>
    <?php
    page_end();
    exit;
}

// ---------- Lista ----------
$search = trim((string) ($_GET['q'] ?? ''));
$status = (string) ($_GET['status'] ?? '');
$where = [];
$params = [];
if ($search !== '') {
    $where[] = '(name LIKE ? OR contact_name LIKE ? OR city LIKE ? OR phone LIKE ?)';
    array_push($params, ...array_fill(0, 4, '%' . $search . '%'));
}
if (isset(STATUS[$status])) {
    $where[] = 'status = ?';
    $params[] = $status;
}
$sql = 'SELECT * FROM companies' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY updated_at DESC, id DESC LIMIT 1000';
$rows = q($sql, $params)->fetchAll();
$total = (int) q('SELECT COUNT(*) FROM companies')->fetchColumn();
$counts = array_column(q('SELECT status, COUNT(*) n FROM companies GROUP BY status')->fetchAll(), 'n', 'status');

page_start('Företag', 'foretag.php');
?>
<div class="page-head row">
  <div class="grow"><h1>Företag</h1><p class="muted"><?= $total ?> bolag</p></div>
  <a class="btn" href="import.php">Importera CSV</a>
  <a class="btn btn-primary" href="foretag.php?ny=1">Nytt bolag</a>
</div>

<form class="filters" method="get">
  <input type="search" name="q" value="<?= e($search) ?>" placeholder="Sök namn, person, ort, telefon" aria-label="Sök">
  <select name="status" aria-label="Status" onchange="this.form.submit()">
    <option value="">Alla statusar</option>
    <?php foreach (STATUS as $key => [$label]): ?>
      <option value="<?= $key ?>" <?= $status === $key ? 'selected' : '' ?>><?= e($label) ?> (<?= (int) ($counts[$key] ?? 0) ?>)</option>
    <?php endforeach; ?>
  </select>
  <button class="btn">Sök</button>
</form>

<?php if (!$rows): ?>
  <section class="card empty">
    <h2><?= $total ? 'Inga bolag matchar' : 'Inga bolag än' ?></h2>
    <p class="muted"><?= $total ? 'Ändra sökningen eller filtret.' : 'Importera ringlistan som CSV eller lägg till ett bolag.' ?></p>
  </section>
<?php else: ?>
<form method="post" id="bulk">
  <?= csrf_field() ?>
  <div class="bulkbar">
    <label class="check"><input type="checkbox" data-check-all> Markera alla</label>
    <button class="btn btn-small danger" name="action" value="delete_selected" onclick="return confirm('Radera markerade bolag?')">Radera markerade</button>
  </div>
  <div class="table-wrap">
  <table>
    <thead><tr><th class="w-check"></th><th>Bolag</th><th class="hide-sm">Kontakt</th><th>Status</th><th class="hide-sm">Ort</th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
      <tr>
        <td><input type="checkbox" name="ids[]" value="<?= (int) $r['id'] ?>" aria-label="Markera <?= e($r['name']) ?>"></td>
        <td><a href="foretag.php?id=<?= (int) $r['id'] ?>"><?= e($r['name']) ?></a><div class="muted small show-sm"><?= e(implode(' · ', array_filter([$r['contact_name'], $r['phone']]))) ?></div></td>
        <td class="hide-sm"><?= e($r['contact_name'] ?? '') ?><div class="muted small"><?= e($r['phone'] ?? '') ?></div></td>
        <td><?= status_badge($r['status']) ?></td>
        <td class="hide-sm"><?= e($r['city'] ?? '') ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>
  </div>
</form>
<form method="post" class="card danger-zone">
  <?= csrf_field() ?><input type="hidden" name="action" value="delete_all">
  <span>Radera alla <?= $total ?> bolag med historik. Skriv <strong>RADERA</strong>:</span>
  <input name="confirm" autocomplete="off" class="w-md" aria-label="Skriv RADERA">
  <button class="btn btn-small danger">Radera alla</button>
</form>
<?php endif;
page_end();
