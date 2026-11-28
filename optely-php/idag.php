<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/layout.php';
require __DIR__ . '/app/calls.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_post();
    if (($_POST['action'] ?? '') === 'more') {
        $n = release_more(5);
        flash($n ? "$n nya bolag i kön." : 'Det finns inga nya bolag att hämta.', $n ? 'ok' : 'error');
        redirect('idag.php');
    }
    $id = (int) ($_POST['id'] ?? 0);
    $error = apply_outcome($id, (string) ($_POST['outcome'] ?? ''), $_POST);
    if ($error) {
        flash($error, 'error');
        redirect('idag.php?id=' . $id);
    }
    $c = company($id);
    flash(($c['name'] ?? 'Bolaget') . ': ' . OUTCOME[$_POST['outcome']]);
    redirect('idag.php');
}

release_new();
$queue = call_queue();
$meetings = meetings();
$stats = today_stats();
$selectedId = (int) ($_GET['id'] ?? 0);
$current = null;
foreach ($queue as $row) {
    if ($row['id'] == $selectedId) {
        $current = $row;
    }
}
$current ??= $queue[0] ?? null;
$history = $current ? call_history((int) $current['id']) : [];
$tomorrow = next_weekday(today());
$waiting = waiting_new();

page_start('Idag', 'idag.php');
?>
<div class="page-head">
  <h1>Idag</h1>
  <p class="muted">
    <strong><?= $stats['called'] ?></strong> ringda ·
    <strong><?= $stats['answered'] ?></strong> svar ·
    <strong class="accent"><?= $stats['booked'] ?></strong> bokade ·
    <strong><?= count($queue) ?></strong> kvar i kön
    <?php if (($up = upcoming_count()) > 0): ?> · <?= $up ?> kommande<?php endif; ?>
  </p>
</div>

<?php if ($meetings): ?>
<section class="card">
  <h2>Möten</h2>
  <ul class="rows">
    <?php foreach ($meetings as $m): $passed = $m['meeting_at'] && $m['meeting_at'] <= now(); ?>
    <li class="row">
      <div class="grow">
        <strong><?= e($m['name']) ?></strong>
        <span class="muted"><?= e(trim(($m['contact_name'] ?? '') . ' · ' . ($m['phone'] ?? ''), ' ·')) ?></span>
        <div class="<?= $passed ? 'warn' : 'muted' ?>"><?= e(fmt_datetime($m['meeting_at'])) ?><?= $passed ? ' · hur gick det?' : '' ?></div>
      </div>
      <?php if ($passed): ?>
      <form method="post" class="inline-form">
        <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $m['id'] ?>">
        <input name="project" placeholder="Projekt" aria-label="Projekt">
        <input name="value_eur" placeholder="€" inputmode="numeric" class="w-sm" aria-label="Värde i euro">
        <button class="btn btn-primary" name="outcome" value="kund">Blev kund</button>
        <button class="btn" name="outcome" value="ingen_affar">Ingen affär</button>
        <input type="date" name="when_date" value="<?= e($tomorrow) ?>" aria-label="Ring upp datum">
        <button class="btn" name="outcome" value="ring_senare">Ring upp</button>
      </form>
      <?php endif; ?>
    </li>
    <?php endforeach; ?>
  </ul>
</section>
<?php endif; ?>

<?php if (!$queue): ?>
  <section class="card empty">
    <h2>Inga samtal kvar i dag</h2>
    <p class="muted">
      Nya bolag släpps in <?= (int) config('new_per_day') ?> per vardag<?= (int) date('N') >= 6 ? ' – i dag är det helg' : '' ?>.
      <?= $waiting ? $waiting . ' bolag väntar.' : 'Lägg till eller importera bolag under <a href="foretag.php">Företag</a>.' ?>
    </p>
    <?php if ($waiting): ?>
      <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="more"><button class="btn btn-primary">Hämta 5 till</button></form>
    <?php endif; ?>
  </section>
<?php else: ?>
<div class="split">
  <section class="card queue" aria-label="Kö">
    <h2>Kö <span class="muted"><?= count($queue) ?></span></h2>
    <ol class="queue-list">
      <?php foreach ($queue as $row): ?>
      <li class="<?= $current && $row['id'] == $current['id'] ? 'selected' : '' ?>">
        <a href="idag.php?id=<?= (int) $row['id'] ?>">
          <span class="grow"><?= e($row['name']) ?></span>
          <?php if ($row['status'] === 'ring_senare'): ?>
            <span class="badge badge-blue"><?= e(date('H:i', strtotime($row['next_call_at']))) ?></span>
          <?php elseif ((int) $row['attempts'] > 0): ?>
            <span class="muted small">försök <?= (int) $row['attempts'] + 1 ?></span>
          <?php endif; ?>
        </a>
      </li>
      <?php endforeach; ?>
    </ol>
    <?php if ($waiting): ?>
      <form method="post" class="more"><?= csrf_field() ?><input type="hidden" name="action" value="more"><button class="btn btn-small">Hämta 5 till</button> <span class="muted small"><?= $waiting ?> väntar</span></form>
    <?php endif; ?>
  </section>

  <section class="card call-card" aria-label="Kontaktkort">
    <div class="call-head">
      <div>
        <h2 class="big"><?= e($current['name']) ?></h2>
        <p class="muted"><?= e(implode(' · ', array_filter([$current['industry'], $current['city']]))) ?></p>
      </div>
      <a class="small" href="foretag.php?id=<?= (int) $current['id'] ?>">Redigera</a>
    </div>

    <div class="contact">
      <div>
        <div><?= e($current['contact_name'] ?: 'Ingen kontaktperson') ?><?php if ($current['contact_role']): ?> <span class="muted">· <?= e($current['contact_role']) ?></span><?php endif; ?></div>
        <div class="muted small"><?= e($current['phone'] ?: 'Inget telefonnummer') ?><?= $current['email'] ? ' · ' . e($current['email']) : '' ?></div>
      </div>
      <?php if ($current['phone']): ?>
        <a class="btn btn-primary btn-call" href="tel:<?= e(preg_replace('/[^\d+]/', '', $current['phone'])) ?>">Ring</a>
      <?php endif; ?>
    </div>
    <?php if ($current['website']): ?>
      <p class="small"><a href="<?= e(preg_match('#^https?://#', $current['website']) ? $current['website'] : 'https://' . $current['website']) ?>" target="_blank" rel="noopener"><?= e($current['website']) ?></a></p>
    <?php endif; ?>
    <?php if ($current['notes']): ?><p class="notes"><?= nl2br(e($current['notes'])) ?></p><?php endif; ?>

    <form method="post" class="outcome-form" id="outcome-form">
      <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $current['id'] ?>">
      <label class="block">Anteckning
        <textarea name="note" rows="2" placeholder="Vad sa de?" id="note"></textarea>
      </label>
      <div class="outcomes">
        <button class="btn" name="outcome" value="inget_svar" data-key="1"><kbd>1</kbd> Inget svar</button>
        <button class="btn" name="outcome" value="nej" data-key="2"><kbd>2</kbd> Svar – nej</button>
        <button class="btn" name="outcome" value="ring_senare" data-key="3" data-needs="when"><kbd>3</kbd> Ring senare</button>
        <button class="btn btn-primary" name="outcome" value="mote_bokat" data-key="4" data-needs="when"><kbd>4</kbd> Möte bokat</button>
        <button class="btn" type="button" data-key="5" data-toggle="wrong-person"><kbd>5</kbd> Fel person</button>
      </div>
      <div class="when" id="when" hidden>
        <label>Dag <input type="date" name="when_date" value="<?= e($tomorrow) ?>"></label>
        <label>Tid <input type="time" name="when_time" value="09:00"></label>
        <span class="muted small">För Ring senare och Möte bokat</span>
      </div>
      <div class="wrong-person" id="wrong-person" hidden>
        <label>Rätt person <input name="contact_name" placeholder="Namn"></label>
        <label>Telefon <input name="phone" type="tel" placeholder="Valfritt"></label>
        <button class="btn" name="outcome" value="fel_person">Spara och ring igen</button>
      </div>
      <p class="small"><button class="link danger" name="outcome" value="ring_ej" onclick="return confirm('Ring aldrig mer till <?= e(addslashes($current['name'])) ?>?')">Ring ej</button></p>
    </form>

    <?php if ($history): ?>
    <h3>Historik</h3>
    <ul class="history">
      <?php foreach ($history as $h): ?>
        <li><span class="muted small"><?= e(fmt_datetime($h['created_at'])) ?></span> <?= e(OUTCOME[$h['outcome']] ?? $h['outcome']) ?><?php if ($h['note']): ?> – <?= e($h['note']) ?><?php endif; ?></li>
      <?php endforeach; ?>
    </ul>
    <?php endif; ?>
  </section>
</div>
<?php endif;
page_end();
