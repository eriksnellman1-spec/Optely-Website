<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_post();
    // Enkel broms mot gissning: max 5 försök per 10 minuter per session.
    $_SESSION['tries'] = array_filter($_SESSION['tries'] ?? [], fn ($t) => $t > time() - 600);
    if (count($_SESSION['tries']) >= 5) {
        $error = 'För många försök. Vänta tio minuter.';
    } elseif (strcasecmp(post('email'), (string) config('user_email')) === 0
        && config('password_hash') && password_verify((string) ($_POST['password'] ?? ''), (string) config('password_hash'))) {
        session_regenerate_id(true);
        $_SESSION['user'] = config('user_email');
        unset($_SESSION['tries']);
        redirect('idag.php');
    } else {
        $_SESSION['tries'][] = time();
        $error = 'Fel e-post eller lösenord.';
    }
}
?><!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Logga in · Optely</title>
  <link rel="stylesheet" href="assets/app.css?v=2">
</head>
<body class="login-page">
  <form method="post" class="card login">
    <h1>Optely</h1>
    <?= csrf_field() ?>
    <label>E-post <input type="email" name="email" required autofocus value="<?= e(post('email')) ?>"></label>
    <label>Lösenord <input type="password" name="password" required></label>
    <?php if ($error): ?><p class="error" role="alert"><?= e($error) ?></p><?php endif; ?>
    <button class="btn btn-primary">Logga in</button>
  </form>
</body>
</html>
