<?php
declare(strict_types=1);

/**
 * Beräkningar för ekonomi, fakturor och investeringar.
 * Samma logik som i Lovable-appen (optely-insight-hub) så att siffrorna stämmer överens.
 */

// =============================================================== EKONOMI

/** Alla månader, äldst först, med kumulativa serier (inkl. fasta kumulativa värden). */
function economy_series(): array
{
    $rows = q('SELECT * FROM months ORDER BY month ASC');
    $paid = paid_invoices_by_month();
    $sum = 0.0;
    $net = 0.0;
    foreach ($rows as &$r) {
        foreach (['revenue', 'mrr', 'one_off', 'costs', 'hours'] as $k) {
            $r[$k] = (float)$r[$k];
        }
        $r['customers'] = (int)$r['customers'];
        $r['leads'] = (int)$r['leads'];
        $sum += $r['revenue'];
        $net += $r['revenue'] - $r['costs'];
        // Ett fast kumulativt värde ersätter summan; senare månader räknas vidare från det.
        if ($r['cum_revenue_override'] !== null) {
            $sum = (float)$r['cum_revenue_override'];
        }
        if ($r['cum_net_override'] !== null) {
            $net = (float)$r['cum_net_override'];
        }
        $r['net'] = $r['revenue'] - $r['costs'];
        $r['cum_revenue'] = $sum;
        $r['cum_net'] = $net;
        $r['paid_invoices'] = $paid[$r['month']] ?? 0.0;
    }
    unset($r);
    return $rows;
}

/** Summa betalda fakturor (exkl. moms) per betalmånad – för avstämning mot manuella siffror. */
function paid_invoices_by_month(): array
{
    $out = [];
    $rows = q("SELECT DATE_FORMAT(COALESCE(paid_at, issued), '%Y-%m') AS m, SUM(amount) AS s
               FROM invoices WHERE status = 'Betald' AND COALESCE(paid_at, issued) IS NOT NULL
               GROUP BY m");
    foreach ($rows as $r) {
        $out[$r['m']] = (float)$r['s'];
    }
    return $out;
}

/**
 * Nyckeltal för en vald månad (eller senaste månaden om ingen anges).
 * @param list<array<string,mixed>> $series från economy_series()
 */
function economy_kpis(array $series, ?string $month = null): ?array
{
    if (!$series) {
        return null;
    }
    $idx = count($series) - 1;
    if ($month !== null) {
        foreach ($series as $i => $r) {
            if ($r['month'] === $month) {
                $idx = $i;
                break;
            }
        }
    }
    $cur = $series[$idx];
    $prev = $idx > 0 ? $series[$idx - 1] : null;

    // Rullande 3 månader för en stabilare bild av trenden
    $last3 = array_slice($series, max(0, $idx - 2), min(3, $idx + 1));
    $avg3 = $last3 ? array_sum(array_column($last3, 'revenue')) / count($last3) : 0.0;

    // Hittills i år (för vald månads år)
    $year = substr($cur['month'], 0, 4);
    $ytdRevenue = 0.0;
    $ytdNet = 0.0;
    $ytdHours = 0.0;
    foreach ($series as $i => $r) {
        if ($i > $idx) {
            break;
        }
        if (str_starts_with($r['month'], $year)) {
            $ytdRevenue += $r['revenue'];
            $ytdNet += $r['net'];
            $ytdHours += $r['hours'];
        }
    }

    return [
        'month'            => $cur['month'],
        'prev_month'       => $prev['month'] ?? null,
        'revenue'          => $cur['revenue'],
        'revenue_change'   => change_pct($cur['revenue'], $prev['revenue'] ?? null),
        'mrr'              => $cur['mrr'],
        'arr'              => $cur['mrr'] * 12,
        'mrr_change'       => change_pct($cur['mrr'], $prev['mrr'] ?? null),
        'one_off'          => $cur['one_off'],
        'costs'            => $cur['costs'],
        'net'              => $cur['net'],
        'net_change'       => change_pct($cur['net'], $prev['net'] ?? null),
        'margin'           => $cur['revenue'] > 0 ? $cur['net'] / $cur['revenue'] * 100 : null,
        'cum_revenue'      => $cur['cum_revenue'],
        'cum_net'          => $cur['cum_net'],
        'customers'        => $cur['customers'],
        'customers_delta'  => $prev ? $cur['customers'] - $prev['customers'] : null,
        'arpc'             => $cur['customers'] > 0 ? $cur['revenue'] / $cur['customers'] : null,
        'leads'            => $cur['leads'],
        'hours'            => $cur['hours'],
        'hourly_rate'      => $cur['hours'] > 0 ? $cur['revenue'] / $cur['hours'] : null,
        'avg3_revenue'     => $avg3,
        'ytd_revenue'      => $ytdRevenue,
        'ytd_net'          => $ytdNet,
        'ytd_hourly_rate'  => $ytdHours > 0 ? $ytdRevenue / $ytdHours : null,
        'paid_invoices'    => $cur['paid_invoices'],
        'note'             => (string)($cur['note'] ?? ''),
    ];
}

// =============================================================== FAKTUROR

const INVOICE_STATUSES = ['Utkast', 'Skickad', 'Betald', 'Krediterad'];

function invoice_total(array $i): float
{
    return (float)$i['amount'] * (1 + (float)$i['vat'] / 100);
}

function invoice_overdue(array $i): bool
{
    return $i['status'] === 'Skickad' && !empty($i['due']) && $i['due'] < today();
}

function invoice_kpis(): array
{
    $rows = q('SELECT * FROM invoices');
    $k = ['outstanding' => 0.0, 'outstanding_count' => 0, 'overdue' => 0.0, 'overdue_count' => 0,
          'paid' => 0.0, 'paid_count' => 0, 'draft' => 0.0, 'draft_count' => 0,
          'paid_this_month' => 0.0, 'avg_days_to_pay' => null];
    $days = [];
    $month = this_month();
    foreach ($rows as $i) {
        $t = invoice_total($i);
        switch ($i['status']) {
            case 'Skickad':
                $k['outstanding'] += $t;
                $k['outstanding_count']++;
                if (invoice_overdue($i)) {
                    $k['overdue'] += $t;
                    $k['overdue_count']++;
                }
                break;
            case 'Betald':
                $k['paid'] += $t;
                $k['paid_count']++;
                if (substr((string)($i['paid_at'] ?: $i['issued']), 0, 7) === $month) {
                    $k['paid_this_month'] += $t;
                }
                if ($i['paid_at'] && $i['issued']) {
                    $days[] = max(0, (strtotime($i['paid_at']) - strtotime($i['issued'])) / 86400);
                }
                break;
            case 'Utkast':
                $k['draft'] += $t;
                $k['draft_count']++;
                break;
        }
    }
    if ($days) {
        $k['avg_days_to_pay'] = array_sum($days) / count($days);
    }
    return $k;
}

/** Nästa lediga fakturanummer i formen ÅÅÅÅ-NNN. */
function next_invoice_number(): string
{
    $year = date('Y');
    $row = q1("SELECT number FROM invoices WHERE number LIKE ? ORDER BY number DESC LIMIT 1", [$year . '-%']);
    $n = $row ? (int)substr((string)$row['number'], 5) + 1 : 1;
    return sprintf('%s-%03d', $year, $n);
}

// =============================================================== INVESTERINGAR

const HOLDING_TYPES = ['Aktie', 'Fond', 'Fastighet'];

function holding_illiquid(array $h): bool
{
    return (int)$h['illiquid'] === 1 || preg_match('/wideotes/i', (string)$h['name']) === 1;
}

/** Totalt insatt kapital: startköp + månadssparande sedan köpdatum. */
function holding_invested(array $h, string $today): float
{
    return (float)$h['purchase_value'] + (float)$h['monthly_saving'] * months_between($h['purchase_date'], $today);
}

function holding_return_pct(array $h, string $today): ?float
{
    if ($h['return_pct_override'] !== null) {
        return (float)$h['return_pct_override'];
    }
    $inv = holding_invested($h, $today);
    return $inv > 0 ? ((float)$h['value'] - $inv) / $inv * 100 : null;
}

function holding_unrealized(array $h, string $today): float
{
    if ($h['return_pct_override'] !== null) {
        return holding_invested($h, $today) * (float)$h['return_pct_override'] / 100;
    }
    return (float)$h['value'] - holding_invested($h, $today);
}

function portfolio(): array
{
    $today = today();
    $holdings = q('SELECT * FROM holdings ORDER BY value DESC');
    $months = q('SELECT * FROM invest_months ORDER BY month ASC');

    $total = 0.0;
    $liquidValue = 0.0;
    $invested = 0.0;
    $unrealized = 0.0;
    $monthReturn = 0.0;
    $monthlySaving = 0.0;
    $savedViaMonthly = 0.0;
    $portfolioMonths = 0;
    $byType = array_fill_keys(HOLDING_TYPES, 0.0);
    $rows = [];

    foreach ($holdings as $h) {
        $value = (float)$h['value'];
        $total += $value;
        $byType[$h['type']] = ($byType[$h['type']] ?? 0) + $value;
        $illiquid = holding_illiquid($h);
        $hInvested = holding_invested($h, $today);
        $hUnreal = holding_unrealized($h, $today);
        $hMonths = months_between($h['purchase_date'], $today);
        if (!$illiquid) {
            $liquidValue += $value;
            $invested += $hInvested;
            $unrealized += $hUnreal;
            $monthReturn += $hUnreal / $hMonths;
            $monthlySaving += (float)$h['monthly_saving'];
            $savedViaMonthly += (float)$h['monthly_saving'] * $hMonths;
            $portfolioMonths = max($portfolioMonths, $hMonths);
        }
        $rows[] = $h + [
            'illiquid_calc' => $illiquid,
            'invested'      => $hInvested,
            'unrealized'    => $hUnreal,
            'return_pct'    => holding_return_pct($h, $today),
        ];
    }

    $years = $portfolioMonths / 12;
    $cagr = ($invested > 0 && $years >= 0.5 && $liquidValue > 0)
        ? (pow($liquidValue / $invested, 1 / $years) - 1) * 100
        : null;

    $liquidRows = array_values(array_filter($rows, fn($r) => !$r['illiquid_calc']));
    $best = $worst = $biggest = null;
    $winners = 0;
    foreach ($liquidRows as $r) {
        $rel = $r['return_pct'] ?? 0.0;
        if ($best === null || $rel > ($best['return_pct'] ?? 0)) {
            $best = $r;
        }
        if ($worst === null || $rel < ($worst['return_pct'] ?? 0)) {
            $worst = $r;
        }
        if ($biggest === null || (float)$r['value'] > (float)$biggest['value']) {
            $biggest = $r;
        }
        if ($r['unrealized'] > 0) {
            $winners++;
        }
    }

    $last = $months ? $months[count($months) - 1] : null;
    $prev = count($months) > 1 ? $months[count($months) - 2] : null;

    return [
        'holdings'          => $rows,
        'months'            => $months,
        'total'             => $total,
        'liquid'            => $liquidValue,
        'illiquid'          => $total - $liquidValue,
        'invested'          => $invested,
        'unrealized'        => $unrealized,
        'return_pct'        => $invested > 0 ? $unrealized / $invested * 100 : null,
        'month_return'      => $monthReturn,
        'monthly_saving'    => $monthlySaving,
        'saved_via_monthly' => $savedViaMonthly,
        'portfolio_months'  => $portfolioMonths,
        'years'             => $years,
        'cagr'              => $cagr,
        'best'              => $best,
        'worst'             => $worst,
        'biggest'           => $biggest,
        'winners'           => $winners,
        'liquid_count'      => count($liquidRows),
        'avg_holding'       => $holdings ? $total / count($holdings) : 0.0,
        'forecast12'        => $liquidValue + $monthlySaving * 12 + $monthReturn * 12,
        'by_type'           => $byType,
        'last_logged'       => $last,
        'logged_delta'      => ($last && $prev) ? (float)$last['total'] - (float)$prev['total'] : null,
        'logged_pct'        => $last ? change_pct((float)$last['total'], $prev ? (float)$prev['total'] : null) : null,
        'last_in_sync'      => !$last || abs((float)$last['total'] - $total) < 0.5,
    ];
}

/** Sparar dagens innehav som portföljvärde för en månad (skriver över om månaden finns). */
function log_portfolio_month(string $month, ?float $total = null): float
{
    $holdings = q('SELECT name, value FROM holdings ORDER BY name');
    $snapshot = array_map(fn($h) => ['name' => $h['name'], 'value' => (float)$h['value']], $holdings);
    $sum = $total ?? array_sum(array_column($snapshot, 'value'));
    exec_sql(
        'INSERT INTO invest_months (month, total, snapshot) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE total = VALUES(total), snapshot = VALUES(snapshot)',
        [$month, $sum, json_encode($snapshot, JSON_UNESCAPED_UNICODE)]
    );
    return $sum;
}
