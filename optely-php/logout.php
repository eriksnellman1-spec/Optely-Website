<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
check_post();
$_SESSION = [];
session_destroy();
redirect('login.php');
