<?php
declare(strict_types=1);

namespace Onaway;

use Throwable;

// The real errors, written to onaway-app/logs/error.log (never to the browser). No personal details.
final class Log
{
    public static function error(Throwable|string $error, array $context = []): void
    {
        $message = $error instanceof Throwable
            ? sprintf('%s: %s @ %s:%d', $error::class, $error->getMessage(), basename($error->getFile()), $error->getLine())
            : $error;
        $line = sprintf(
            "[%s UTC] %s%s\n",
            gmdate('Y-m-d H:i:s'),
            $message,
            $context ? ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : ''
        );

        $dir = ONAWAY_APP_ROOT . '/logs';
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        if (@file_put_contents($dir . '/error.log', $line, FILE_APPEND | LOCK_EX) === false) {
            error_log(rtrim($line));
        }
    }
}
