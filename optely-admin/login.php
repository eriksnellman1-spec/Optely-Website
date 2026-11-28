<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';

start_session();
if (is_logged_in()) {
    redirect('index.php');
}

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

$hash = (string)config('admin_password_hash', '');
$error = '';
$generatedHash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $password = (string)($_POST['password'] ?? '');

    if ($hash === '') {
        // Första start: hjälp till att skapa en hash. Ingenting sparas.
        if (mb_strlen($password) < 10) {
            $error = 'Välj ett lösenord på minst 10 tecken.';
        } else {
            $generatedHash = password_hash($password, PASSWORD_DEFAULT);
        }
    } else {
        $ip = client_ip();
        exec_sql('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)');
        $recent = (int)(q1(
            'SELECT COUNT(*) AS c FROM login_attempts WHERE ip = ? AND attempted_at > (NOW() - INTERVAL ' . WINDOW_MINUTES . ' MINUTE)',
            [$ip]
        )['c'] ?? 0);

        if ($recent >= MAX_ATTEMPTS) {
            $error = 'För många försök. Vänta ' . WINDOW_MINUTES . ' minuter och försök igen.';
        } elseif (password_verify($password, $hash)) {
            exec_sql('DELETE FROM login_attempts WHERE ip = ?', [$ip]);
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            redirect('index.php');
        } else {
            exec_sql('INSERT INTO login_attempts (ip) VALUES (?)', [$ip]);
            usleep(400000);
            $error = 'Fel lösenord.';
        }
    }
}
?>
<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Logga in · Optely Admin</title>
  <link rel="stylesheet" href="assets/app.css?v=1">
</head>
<body>
<div class="auth">
  <div class="auth-card">
    <div class="brand"><span class="brand-mark">O</span><span>Optely <em>Admin</em></span></div>

    <?php if ($hash === ''): ?>
      <h1>Välj lösenord</h1>
      <?php if ($generatedHash !== ''): ?>
        <p>Klistra in raden nedan i <code>app/config.php</code> som <code>admin_password_hash</code> och ladda sedan om sidan.</p>
        <div class="copy-row">
          <input id="hash" type="text" readonly value="<?= h($generatedHash) ?>" onclick="this.select()">
          <button type="button" class="btn btn-sm" data-copy="hash">Kopiera</button>
        </div>
      <?php else: ?>
        <p>Inget lösenord är inställt ännu. Skriv ett lösenord så skapas en hash som du sparar i konfigurationen.</p>
        <?php if ($error): ?><div class="flash flash-error"><?= h($error) ?></div><?php endif; ?>
        <form method="post">
          <?= csrf_field() ?>
          <div class="field">
            <label for="password">Nytt lösenord</label>
            <input id="password" name="password" type="password" autocomplete="new-password" minlength="10" required autofocus>
          </div>
          <button class="btn btn-primary" type="submit">Skapa hash</button>
        </form>
      <?php endif; ?>
    <?php else: ?>
      <h1>Logga in</h1>
      <p>Optelys ekonomi, fakturor och investeringar.</p>
      <?php if ($error): ?><div class="flash flash-error"><?= h($error) ?></div><?php endif; ?>
      <form method="post">
        <?= csrf_field() ?>
        <div class="field">
          <label for="password">Lösenord</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        </div>
        <button class="btn btn-primary" type="submit">Logga in</button>
      </form>
    <?php endif; ?>
  </div>
</div>
<script src="assets/app.js?v=1"></script>
</body>
</html>
