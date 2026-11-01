<?php
// ONAWAY · the serving hatch for quote requests (POST /api/quote.php).
// No secrets, no logic: it hands the request to the kitchen, outside the document root.
const ONAWAY_BOOTSTRAP = '/home/adeonvqg/onaway-app/bootstrap.php';

if (!is_file(ONAWAY_BOOTSTRAP)) {
    error_log('ONAWAY: the kitchen is missing at ' . ONAWAY_BOOTSTRAP);
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"ok":false,"error":"server"}';
    exit;
}

require ONAWAY_BOOTSTRAP;
Onaway\QuoteHandler::run();
