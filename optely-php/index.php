<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
redirect(empty($_SESSION['user']) ? 'login.php' : 'idag.php');
