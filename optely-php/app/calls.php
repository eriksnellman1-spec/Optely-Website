<?php
declare(strict_types=1);

/** Släpper in nya bolag i ringkön: upp till new_per_day per vardag. */
function release_new(): void
{
    if ((int) date('N') >= 6) {
        return;
    }
    $released = (int) q('SELECT COUNT(*) FROM companies WHERE released_on = ?', [today()])->fetchColumn();
    $room = (int) config('new_per_day') - $released;
    if ($room <= 0) {
        return;
    }
    $ids = q("SELECT id FROM companies WHERE status = 'ny' ORDER BY id LIMIT " . $room)->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $id) {
        q("UPDATE companies SET status = 'ko', released_on = ?, next_call_at = ?, updated_at = ? WHERE id = ? AND status = 'ny'",
            [today(), today() . ' 08:00:00', now(), $id]);
    }
}

/** Tidpunkt som lägger ett bolag först i dagens kö (kön sorteras på next_call_at). */
function first_in_queue(): string
{
    return today() . ' 00:00:00';
}

/** Släpper in $n nya bolag direkt (knappen "Hämta 5 till"), även på helger. Returnerar antal. */
function release_more(int $n): int
{
    $ids = q("SELECT id FROM companies WHERE status = 'ny' ORDER BY id LIMIT " . max(1, min($n, 50)))->fetchAll(PDO::FETCH_COLUMN);
    foreach ($ids as $id) {
        q("UPDATE companies SET status = 'ko', released_on = ?, next_call_at = ?, updated_at = ? WHERE id = ? AND status = 'ny'",
            [today(), now(), now(), $id]);
    }
    return count($ids);
}

function waiting_new(): int
{
    return (int) q("SELECT COUNT(*) FROM companies WHERE status = 'ny'")->fetchColumn();
}

/** Dagens ringkö: i kön eller ring senare, med tid i dag eller tidigare. */
function call_queue(): array
{
    return q("SELECT * FROM companies
               WHERE status IN ('ko', 'ring_senare') AND next_call_at <= ?
               ORDER BY next_call_at, id", [today() . ' 23:59:59'])->fetchAll();
}

function upcoming_count(): int
{
    return (int) q("SELECT COUNT(*) FROM companies WHERE status IN ('ko', 'ring_senare') AND next_call_at > ?",
        [today() . ' 23:59:59'])->fetchColumn();
}

/** Bokade möten: passerade (ska följas upp) och kommande. */
function meetings(): array
{
    return q("SELECT * FROM companies WHERE status = 'mote_bokat' ORDER BY meeting_at")->fetchAll();
}

function today_stats(): array
{
    $rows = q('SELECT outcome, COUNT(*) n FROM calls WHERE created_at >= ? GROUP BY outcome', [today() . ' 00:00:00'])->fetchAll();
    $by = array_column($rows, 'n', 'outcome');
    $called = array_sum(array_map(fn ($o) => (int) ($by[$o] ?? 0), ['inget_svar', 'nej', 'ring_senare', 'mote_bokat', 'fel_person', 'ring_ej']));
    return [
        'called' => $called,
        'answered' => $called - (int) ($by['inget_svar'] ?? 0),
        'booked' => (int) ($by['mote_bokat'] ?? 0),
    ];
}

function company(int $id): ?array
{
    $row = q('SELECT * FROM companies WHERE id = ?', [$id])->fetch();
    return $row ?: null;
}

function call_history(int $id): array
{
    return q('SELECT * FROM calls WHERE company_id = ? ORDER BY created_at DESC, id DESC LIMIT 50', [$id])->fetchAll();
}

/** Tolkar datum + tid från formuläret (Y-m-d och H:i). */
function parse_when(string $date, string $time): ?string
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return null;
    }
    $time = preg_match('/^\d{2}:\d{2}$/', $time) ? $time : '09:00';
    return $date . ' ' . $time . ':00';
}

/**
 * Sparar ett utfall. Returnerar ett felmeddelande eller null.
 * $in: note, when_date, when_time, contact_name, phone, project, value_eur
 */
function apply_outcome(int $id, string $outcome, array $in): ?string
{
    $c = company($id);
    if (!$c) {
        return 'Bolaget finns inte längre.';
    }
    if (!isset(OUTCOME[$outcome])) {
        return 'Okänt utfall.';
    }
    $note = trim((string) ($in['note'] ?? ''));
    $when = parse_when(trim((string) ($in['when_date'] ?? '')), trim((string) ($in['when_time'] ?? '')));
    $now = now();

    $pdo = db();
    $pdo->beginTransaction();
    try {
        switch ($outcome) {
            case 'inget_svar':
                $attempts = (int) $c['attempts'] + 1;
                if ($attempts >= (int) config('max_attempts')) {
                    q("UPDATE companies SET status = 'inget_svar', attempts = ?, next_call_at = NULL, updated_at = ? WHERE id = ?",
                        [$attempts, $now, $id]);
                } else {
                    q("UPDATE companies SET status = 'ko', attempts = ?, next_call_at = ?, updated_at = ? WHERE id = ?",
                        [$attempts, next_weekday(today()) . ' 09:00:00', $now, $id]);
                }
                break;
            case 'nej':
            case 'ingen_affar':
                q("UPDATE companies SET status = 'nej', next_call_at = NULL, meeting_at = NULL, updated_at = ? WHERE id = ?", [$now, $id]);
                break;
            case 'ring_ej':
                q("UPDATE companies SET status = 'ring_ej', next_call_at = NULL, meeting_at = NULL, updated_at = ? WHERE id = ?", [$now, $id]);
                break;
            case 'ring_senare':
                if (!$when || $when <= $now) {
                    $pdo->rollBack();
                    return 'Välj när du ska ringa igen (en tid framåt).';
                }
                q("UPDATE companies SET status = 'ring_senare', next_call_at = ?, meeting_at = NULL, attempts = 0, updated_at = ? WHERE id = ?",
                    [$when, $now, $id]);
                break;
            case 'mote_bokat':
                if (!$when) {
                    $pdo->rollBack();
                    return 'Välj dag och tid för mötet.';
                }
                q("UPDATE companies SET status = 'mote_bokat', meeting_at = ?, next_call_at = NULL, updated_at = ? WHERE id = ?",
                    [$when, $now, $id]);
                break;
            case 'fel_person':
                $name = trim((string) ($in['contact_name'] ?? ''));
                if ($name === '') {
                    $pdo->rollBack();
                    return 'Skriv namnet på rätt person.';
                }
                $phone = trim((string) ($in['phone'] ?? ''));
                q("UPDATE companies SET contact_name = ?, contact_role = NULL, phone = COALESCE(NULLIF(?, ''), phone),
                          status = 'ko', attempts = 0, next_call_at = ?, updated_at = ? WHERE id = ?",
                    [$name, $phone, first_in_queue(), $now, $id]);
                $note = trim('Rätt person: ' . $name . ($phone !== '' ? ' ' . $phone : '') . ($note !== '' ? '. ' . $note : ''));
                break;
            case 'kund':
                q("UPDATE companies SET status = 'kund', next_call_at = NULL, updated_at = ? WHERE id = ?", [$now, $id]);
                $value = preg_replace('/\D/', '', (string) ($in['value_eur'] ?? ''));
                q('INSERT INTO customers (company_id, project, value_eur, started_on, updated_at) VALUES (?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE project = COALESCE(VALUES(project), project), value_eur = COALESCE(VALUES(value_eur), value_eur),
                                           active = 1, updated_at = VALUES(updated_at)',
                    [$id, nullable(trim((string) ($in['project'] ?? ''))), $value === '' ? null : (int) $value, today(), $now]);
                break;
        }
        q('INSERT INTO calls (company_id, outcome, note, created_at) VALUES (?, ?, ?, ?)',
            [$id, $outcome, $note === '' ? null : $note, $now]);
        $pdo->commit();
    } catch (Throwable $t) {
        $pdo->rollBack();
        throw $t;
    }
    return null;
}
