<?php
declare(strict_types=1);

const NAV = [
    'ekonomi'       => ['href' => 'index.php',         'label' => 'Ekonomi',       'icon' => 'M3 3v18h18M7 15l4-4 3 3 5-6'],
    'fakturor'      => ['href' => 'fakturor.php',      'label' => 'Fakturor',      'icon' => 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6'],
    'investeringar' => ['href' => 'investeringar.php', 'label' => 'Investeringar', 'icon' => 'M3 17l6-6 4 4 8-8M15 7h6v6'],
    'integrationer' => ['href' => 'integrationer.php', 'label' => 'Integrationer', 'icon' => 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'],
];

function icon(string $path, int $size = 18): string
{
    return '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        . 'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' . h($path) . '"/></svg>';
}

function page_header(string $title, string $active): void
{
    $flashes = take_flashes();
    ?>
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= h($title) ?> · Optely Admin</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%231c7a72'/><text x='16' y='22' font-family='Arial' font-weight='700' font-size='17' text-anchor='middle' fill='white'>O</text></svg>">
  <link rel="stylesheet" href="assets/app.css?v=1">
</head>
<body>
<div class="shell">
  <aside class="sidebar">
    <a class="brand" href="index.php"><span class="brand-mark">O</span><span>Optely <em>Admin</em></span></a>
    <nav class="nav">
      <?php foreach (NAV as $key => $item): ?>
        <a href="<?= h($item['href']) ?>" class="<?= $key === $active ? 'active' : '' ?>"<?= $key === $active ? ' aria-current="page"' : '' ?>>
          <?= icon($item['icon']) ?><span><?= h($item['label']) ?></span>
        </a>
      <?php endforeach; ?>
    </nav>
    <form method="post" action="logout.php" class="logout">
      <?= csrf_field() ?>
      <button type="submit" class="nav-btn"><?= icon('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3') ?><span>Logga ut</span></button>
    </form>
  </aside>
  <main class="main">
    <?php foreach ($flashes as $f): ?>
      <div class="flash flash-<?= h($f['type']) ?>" role="status"><?= h($f['message']) ?></div>
    <?php endforeach; ?>
<?php
}

function page_footer(): void
{
    ?>
  </main>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="assets/app.js?v=1"></script>
</body>
</html>
<?php
}

function page_title(string $title, string $subtitle = '', string $actions = ''): void
{
    ?>
    <header class="page-title">
      <div>
        <h1><?= h($title) ?></h1>
        <?php if ($subtitle !== ''): ?><p><?= h($subtitle) ?></p><?php endif; ?>
      </div>
      <?php if ($actions !== ''): ?><div class="page-actions"><?= $actions ?></div><?php endif; ?>
    </header>
<?php
}

/**
 * KPI-kort. $trend är en procentsats (positivt = grönt). $invert vänder färgen
 * (t.ex. kostnader där minskning är bra).
 */
function kpi(string $label, string $value, string $sub = '', ?float $trend = null, bool $invert = false, string $tone = ''): string
{
    $trendHtml = '';
    if ($trend !== null && is_finite($trend)) {
        $good = $invert ? $trend < 0 : $trend > 0;
        $cls = abs($trend) < 0.05 ? 'flat' : ($good ? 'up' : 'down');
        $arrow = $trend > 0 ? '↑' : ($trend < 0 ? '↓' : '→');
        $trendHtml = '<span class="trend ' . $cls . '">' . $arrow . ' ' . h(pct($trend)) . '</span>';
    }
    return '<div class="kpi' . ($tone ? ' kpi-' . h($tone) : '') . '">'
        . '<p class="kpi-label">' . h($label) . '</p>'
        . '<p class="kpi-value">' . h($value) . '</p>'
        . '<p class="kpi-sub">' . $trendHtml . ($sub !== '' ? '<span>' . h($sub) . '</span>' : '') . '</p>'
        . '</div>';
}

function badge(string $text): string
{
    $map = [
        'Betald' => 'green', 'Skickad' => 'amber', 'Förfallen' => 'red', 'Utkast' => 'gray', 'Krediterad' => 'gray',
        'Aktie' => 'teal', 'Fond' => 'blue', 'Fastighet' => 'violet',
    ];
    return '<span class="badge badge-' . ($map[$text] ?? 'gray') . '">' . h($text) . '</span>';
}

function empty_state(string $title, string $text): string
{
    return '<div class="empty"><p class="empty-title">' . h($title) . '</p><p>' . h($text) . '</p></div>';
}

/** Tal med färg efter tecken. */
function signed_eur(float $n, int $decimals = 0): string
{
    $cls = $n > 0.004 ? 'pos' : ($n < -0.004 ? 'neg' : '');
    return '<span class="' . $cls . '">' . ($n > 0.004 ? '+' : '') . h(eur($n, $decimals)) . '</span>';
}

function signed_pct(?float $n): string
{
    if ($n === null) {
        return '<span class="muted">–</span>';
    }
    $cls = $n > 0.004 ? 'pos' : ($n < -0.004 ? 'neg' : '');
    return '<span class="' . $cls . '">' . h(pct($n)) . '</span>';
}

function select_options(array $options, ?string $selected, ?callable $label = null): string
{
    $out = '';
    foreach ($options as $o) {
        $out .= '<option value="' . h($o) . '"' . ((string)$o === (string)$selected ? ' selected' : '') . '>'
            . h($label ? $label($o) : $o) . '</option>';
    }
    return $out;
}

/**
 * Diagram (Chart.js). $spec = ['type' => 'bar'|'line'|'doughnut', 'labels' => [...],
 * 'series' => [['label' => ..., 'data' => [...], 'type'?, 'color'?, 'fill'?, 'dashed'?]], 'format' => 'eur'|'number']
 */
function chart(string $id, array $spec, int $height = 260): string
{
    return '<div class="chart-box" style="height:' . $height . 'px"><canvas data-chart="' . h($id) . '-data" role="img" aria-label="'
        . h(implode(', ', array_column($spec['series'], 'label'))) . '"></canvas></div>'
        . '<script type="application/json" id="' . h($id) . '-data">' . json_attr($spec) . '</script>';
}

/** Visa ett fältvärde i formulär: tomt för 0 om $blankZero. */
function fv(mixed $v, bool $blankZero = false): string
{
    if ($v === null) {
        return '';
    }
    if (is_numeric($v)) {
        $f = (float)$v;
        if ($blankZero && abs($f) < 0.000001) {
            return '';
        }
        return h(rtrim(rtrim(number_format($f, 2, '.', ''), '0'), '.'));
    }
    return h($v);
}
