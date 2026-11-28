<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';

start_session();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $_SESSION = [];
    session_destroy();
}
redirect('login.php');
