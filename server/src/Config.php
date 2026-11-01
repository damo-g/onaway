<?php
declare(strict_types=1);

namespace Onaway;

use RuntimeException;

// Reads config.php once per request.
final class Config
{
    private static ?array $values = null;

    public static function load(): array
    {
        if (self::$values === null) {
            $file = ONAWAY_APP_ROOT . '/config.php';
            if (!is_file($file)) {
                throw new RuntimeException('config.php is missing in ' . ONAWAY_APP_ROOT);
            }
            $values = require $file;
            if (!is_array($values)) {
                throw new RuntimeException('config.php must return an array');
            }
            self::$values = $values;
        }
        return self::$values;
    }

    // Tests only: use these values instead of config.php
    public static function set(array $values): void
    {
        self::$values = $values;
    }
}
