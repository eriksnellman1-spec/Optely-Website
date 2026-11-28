<?php
declare(strict_types=1);

function page_start(string $title, string $active = ''): void
{
    $nav = ['idag.php' => 'Idag', 'foretag.php' => 'Företag', 'kunder.php' => 'Kunder'];
    $flash = flash();
    ?><!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($title) ?> · Optely</title>
  <link rel="stylesheet" href="assets/app.css?v=2">
</head>
<body>
<header class="topbar">
  <a class="brand" href="idag.php">Optely</a>
  <nav>
    <?php foreach ($nav as $href => $label): ?>
      <a href="<?= $href ?>" class="<?= $active === $href ? 'active' : '' ?>"><?= e($label) ?></a>
    <?php endforeach; ?>
  </nav>
  <form method="post" action="logout.php" class="logout"><?= csrf_field() ?><button class="link">Logga ut</button></form>
</header>
<main>
<?php if ($flash): ?>
  <div class="flash flash-<?= e($flash['kind']) ?>" role="status"><?= e($flash['msg']) ?></div>
<?php endif;
}

function page_end(): void
{
    ?>
</main>
<script src="assets/app.js?v=2"></script>
</body>
</html>
<?php
}
