<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
require __DIR__ . '/app/layout.php';
require_login();

const IMPORT_FIELDS = [
    'name' => ['Företagsnamn *', ['företag', 'företagsnamn', 'bolag', 'namn', 'firma', 'toiminimi', 'yritys', 'nimi', 'company', 'name']],
    'contact_name' => ['Kontaktperson / VD', ['vd', 'kontaktperson', 'kontakt', 'toimitusjohtaja', 'yhteyshenkilö', 'ceo', 'contact']],
    'phone' => ['Telefon', ['telefon', 'tel', 'puhelin', 'phone', 'mobil']],
    'email' => ['E-post', ['e-post', 'epost', 'email', 'e-mail', 'sähköposti', 'mejl']],
    'industry' => ['Bransch', ['bransch', 'toimiala', 'industry', 'verksamhet']],
    'city' => ['Ort', ['ort', 'kommun', 'postort', 'kotikunta', 'postitoimipaikka', 'kunta', 'city', 'stad']],
    'website' => ['Webb', ['webb', 'hemsida', 'www', 'kotisivu', 'website', 'url']],
    'org_nr' => ['FO-nummer', ['fo-nummer', 'y-tunnus', 'ytunnus', 'business id', 'org.nr']],
    'notes' => ['Anteckning', ['anteckning', 'kommentar', 'notes', 'huomio']],
];

function norm_header(string $s): string
{
    return trim(preg_replace('/[^a-zåäöé0-9]+/u', ' ', mb_strtolower($s)));
}

function norm_name(string $s): string
{
    $s = mb_strtolower($s);
    $s = preg_replace('/\b(oy ab|ab oy|oyj|oy|ab|ky|tmi|ltd|kb)\b/u', ' ', $s);
    return trim(preg_replace('/[^a-zåäöé0-9]+/u', '', $s));
}

function norm_phone(?string $s): string
{
    $d = preg_replace('/\D/', '', (string) $s);
    if (str_starts_with($d, '00358')) {
        $d = '0' . substr($d, 5);
    } elseif (str_starts_with($d, '358') && strlen($d) > 9) {
        $d = '0' . substr($d, 3);
    }
    return $d;
}

/** Läser CSV (; , eller tab), UTF-8 eller Windows-1252, med BOM. */
function read_csv(string $path): array
{
    $text = (string) file_get_contents($path);
    $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
    if (!mb_check_encoding($text, 'UTF-8')) {
        $text = mb_convert_encoding($text, 'UTF-8', 'Windows-1252');
    }
    $first = strtok($text, "\n") ?: '';
    $delims = [';' => substr_count($first, ';'), ',' => substr_count($first, ','), "\t" => substr_count($first, "\t")];
    arsort($delims);
    $delim = (string) array_key_first($delims);
    $rows = [];
    $fh = fopen('php://temp', 'r+');
    fwrite($fh, $text);
    rewind($fh);
    while (($r = fgetcsv($fh, 0, $delim, '"', '')) !== false) {
        if ($r === [null] || implode('', $r) === '') {
            continue;
        }
        $rows[] = array_map(fn ($v) => trim((string) $v), $r);
    }
    fclose($fh);
    return $rows;
}

function guess_mapping(array $headers): array
{
    $h = array_map('norm_header', $headers);
    $used = [];
    $out = [];
    foreach (IMPORT_FIELDS as $key => [, $guesses]) {
        $idx = -1;
        foreach ([true, false] as $exact) {
            foreach ($h as $i => $col) {
                if (isset($used[$i])) {
                    continue;
                }
                foreach ($guesses as $g) {
                    $g = norm_header($g);
                    if ($exact ? $col === $g : (mb_strlen($g) > 3 && str_contains($col, $g))) {
                        $idx = $i;
                        break 3;
                    }
                }
            }
        }
        if ($idx >= 0) {
            $used[$idx] = true;
        }
        $out[$key] = $idx;
    }
    return $out;
}

/** Bygger rader enligt kolumnvalet och markerar dubbletter (mot registret och tidigare rader i filen). */
function build_rows(array $data, array $map): array
{
    $existingNames = [];
    $existingPhones = [];
    foreach (q('SELECT name, phone FROM companies')->fetchAll() as $c) {
        $existingNames[norm_name($c['name'])] = true;
        if (strlen($p = norm_phone($c['phone'])) >= 6) {
            $existingPhones[$p] = true;
        }
    }
    $seenNames = [];
    $seenPhones = [];
    $rows = [];
    foreach ($data as $i => $r) {
        $row = [];
        foreach ($map as $key => $idx) {
            $row[$key] = $idx >= 0 ? ($r[$idx] ?? '') : '';
        }
        $n = norm_name($row['name']);
        $p = norm_phone($row['phone']);
        $row['_dup'] = match (true) {
            $row['name'] === '' => 'saknar namn',
            isset($existingNames[$n]) => 'finns redan (namn)',
            strlen($p) >= 6 && isset($existingPhones[$p]) => 'finns redan (telefon)',
            isset($seenNames[$n]) => 'samma namn tidigare i filen',
            strlen($p) >= 6 && isset($seenPhones[$p]) => 'samma telefon tidigare i filen',
            default => '',
        };
        if ($row['name'] !== '') {
            $seenNames[$n] = true;
            if (strlen($p) >= 6) {
                $seenPhones[$p] = true;
            }
        }
        $rows[] = $row;
    }
    return $rows;
}

$step = 'upload';
$imp = $_SESSION['import'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_post();
    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'upload') {
        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK || $file['size'] > 5_000_000) {
            flash('Välj en CSV-fil (max 5 MB).', 'error');
            redirect('import.php');
        }
        $all = read_csv($file['tmp_name']);
        if (count($all) < 2) {
            flash('Filen behöver en rubrikrad och minst en rad med bolag.', 'error');
            redirect('import.php');
        }
        $headers = array_shift($all);
        $_SESSION['import'] = [
            'file' => mb_substr((string) $file['name'], 0, 120),
            'headers' => $headers,
            'rows' => array_slice($all, 0, 3000),
            'map' => guess_mapping($headers),
            'source' => 'Ringlista',
        ];
        redirect('import.php');
    }

    if ($action === 'cancel') {
        unset($_SESSION['import']);
        redirect('import.php');
    }

    if ($imp && in_array($action, ['map', 'import'], true)) {
        foreach (array_keys(IMPORT_FIELDS) as $key) {
            $imp['map'][$key] = (int) ($_POST['map'][$key] ?? -1);
        }
        $imp['source'] = post('source') ?: 'Ringlista';
        $_SESSION['import'] = $imp;
        if ($imp['map']['name'] < 0) {
            flash('Välj vilken kolumn som är företagsnamn.', 'error');
            redirect('import.php');
        }
        if ($action === 'import') {
            $includeDup = post('include_dup') === '1';
            $n = 0;
            $now = now();
            db()->beginTransaction();
            foreach (build_rows($imp['rows'], $imp['map']) as $r) {
                if ($r['name'] === '' || ($r['_dup'] !== '' && !$includeDup)) {
                    continue;
                }
                $site = $r['website'];
                q('INSERT INTO companies (name, contact_name, phone, email, industry, city, website, org_nr, notes, status, source, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'ny\', ?, ?, ?)',
                    [mb_substr($r['name'], 0, 255), nullable($r['contact_name']), nullable($r['phone']), nullable(mb_strtolower($r['email'])),
                        nullable($r['industry']), nullable($r['city']), nullable($site), nullable($r['org_nr']), nullable($r['notes']),
                        mb_substr($imp['source'], 0, 120), $now, $now]);
                $n++;
            }
            db()->commit();
            unset($_SESSION['import']);
            flash("$n bolag importerade. De släpps in i Idag " . (int) config('new_per_day') . ' per vardag.');
            redirect('foretag.php?status=ny');
        }
        redirect('import.php');
    }
    redirect('import.php');
}

page_start('Importera', 'foretag.php');
?>
<p><a href="foretag.php" class="small">← Företag</a></p>
<div class="page-head"><h1>Importera bolag</h1><p class="muted">CSV från Excel, PRH eller Profinder. Första raden ska vara rubriker.</p></div>

<?php if (!$imp): ?>
<form method="post" enctype="multipart/form-data" class="card">
  <?= csrf_field() ?><input type="hidden" name="action" value="upload">
  <label class="block">CSV-fil <input type="file" name="file" accept=".csv,.txt,text/csv" required></label>
  <p class="muted small">Excel: Arkiv → Spara som → CSV UTF-8.</p>
  <button class="btn btn-primary">Läs in filen</button>
</form>
<?php else:
    $rows = build_rows($imp['rows'], $imp['map']);
    $fresh = count(array_filter($rows, fn ($r) => $r['_dup'] === ''));
    $dups = count(array_filter($rows, fn ($r) => $r['_dup'] !== '' && $r['name'] !== ''));
    $noName = count(array_filter($rows, fn ($r) => $r['name'] === ''));
?>
<form method="post" class="card">
  <?= csrf_field() ?>
  <p><strong><?= e($imp['file']) ?></strong> · <?= count($imp['rows']) ?> rader</p>
  <h2>Koppla kolumner</h2>
  <div class="map-grid">
    <?php foreach (IMPORT_FIELDS as $key => [$label]): ?>
      <label><?= e($label) ?>
        <select name="map[<?= $key ?>]">
          <option value="-1">– ingen –</option>
          <?php foreach ($imp['headers'] as $i => $h): ?>
            <option value="<?= $i ?>" <?= $imp['map'][$key] === $i ? 'selected' : '' ?>><?= e($h !== '' ? $h : 'Kolumn ' . ($i + 1)) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
    <?php endforeach; ?>
    <label>Källa <input name="source" value="<?= e($imp['source']) ?>"></label>
  </div>
  <p><button class="btn" name="action" value="map">Uppdatera förhandsvisning</button></p>

  <h2>Förhandsvisning</h2>
  <p><strong><?= $fresh ?></strong> nya · <span class="warn"><?= $dups ?> dubbletter</span><?= $noName ? ' · <span class="error">' . $noName . ' saknar namn</span>' : '' ?></p>
  <div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Bolag</th><th class="hide-sm">Kontakt</th><th class="hide-sm">Telefon</th><th>Kontroll</th></tr></thead>
    <tbody>
    <?php foreach (array_slice($rows, 0, 200) as $i => $r): ?>
      <tr class="<?= $r['_dup'] ? 'dim' : '' ?>">
        <td class="muted small"><?= $i + 1 ?></td>
        <td><?= e($r['name'] ?: '–') ?><div class="muted small"><?= e(implode(' · ', array_filter([$r['industry'], $r['city']]))) ?></div></td>
        <td class="hide-sm"><?= e($r['contact_name']) ?></td>
        <td class="hide-sm"><?= e($r['phone']) ?></td>
        <td><?= $r['_dup'] ? '<span class="warn small">' . e($r['_dup']) . '</span>' : '<span class="ok small">Ny</span>' ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
  <?php if (count($rows) > 200): ?><p class="muted small">Visar de första 200 raderna.</p><?php endif; ?>
  <label class="check"><input type="checkbox" name="include_dup" value="1"> Importera även dubbletter (rekommenderas inte)</label>
  <div class="actions">
    <button class="btn btn-primary" name="action" value="import">Importera <?= $fresh ?> bolag</button>
    <button class="btn" name="action" value="cancel" formnovalidate>Avbryt</button>
  </div>
</form>
<?php endif;
page_end();
