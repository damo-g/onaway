<?php
// ONAWAY kitchen · the one file the hatch (onaway.ca/api/quote.php) requires.
// Lives at /home/adeonvqg/onaway-app/, outside every document root. Errors are logged, never shown.
declare(strict_types=1);

define('ONAWAY_APP_ROOT', __DIR__);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/logs/php-errors.log');

// Everything is stored in UTC; Toronto time is applied where it's shown (reference, promise label)
date_default_timezone_set('UTC');

// Onaway\… from src/; PHPMailer (vendored from its v7.1.1 release, no Composer) from vendor/phpmailer/src/
spl_autoload_register(static function (string $class): void {
    foreach (['Onaway\\' => '/src/', 'PHPMailer\\PHPMailer\\' => '/vendor/phpmailer/src/'] as $prefix => $dir) {
        if (strncmp($class, $prefix, strlen($prefix)) === 0) {
            $file = __DIR__ . $dir . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) {
                require $file;
            }
            return;
        }
    }
});
