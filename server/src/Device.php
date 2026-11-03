<?php
declare(strict_types=1);

namespace Onaway;

// The browser's user agent, read into "Phone · iOS 18.1 · Safari 18" for the team. No library: the
// common cases only, and anything unknown is simply left out. (iPads on iPadOS 13+ report as a Mac.)
final class Device
{
    public static function describe(?string $ua): string
    {
        $ua = (string) $ua;
        if ($ua === '') {
            return '';
        }
        return implode(' · ', array_filter([self::kind($ua), self::os($ua), self::browser($ua)]));
    }

    private static function kind(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $ua) => 'Tablet',
            (bool) preg_match('/Mobi|iPhone|iPod|Android/i', $ua) => 'Phone',
            (bool) preg_match('/bot|crawl|spider|curl|wget|python|http/i', $ua) => 'Bot or script',
            default => 'Computer',
        };
    }

    private static function os(string $ua): string
    {
        return match (true) {
            (bool) preg_match('/(?:iPhone|CPU) OS (\d+)(?:_(\d+))?/', $ua, $m) => (str_contains($ua, 'iPad') ? 'iPadOS ' : 'iOS ') . $m[1] . (isset($m[2]) && $m[2] !== '' ? ".$m[2]" : ''),
            (bool) preg_match('/Android (\d+(?:\.\d+)?)/', $ua, $m) => "Android {$m[1]}",
            (bool) preg_match('/Windows NT 10/', $ua) => 'Windows 10/11',
            (bool) preg_match('/Windows NT (6\.[0-3])/', $ua, $m) => 'Windows ' . ['6.0' => 'Vista', '6.1' => '7', '6.2' => '8', '6.3' => '8.1'][$m[1]],
            str_contains($ua, 'CrOS') => 'ChromeOS',
            str_contains($ua, 'Mac OS X') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => '',
        };
    }

    private static function browser(string $ua): string
    {
        $browsers = [
            'Edge' => '/Edg(?:e|A|iOS)?\/(\d+)/',
            'Opera' => '/(?:OPR|OPT)\/(\d+)/',
            'Samsung Internet' => '/SamsungBrowser\/(\d+)/',
            'Firefox' => '/(?:Firefox|FxiOS)\/(\d+)/',
            'Chrome' => '/(?:Chrome|CriOS)\/(\d+)/',
            'Safari' => '/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/',
        ];
        foreach ($browsers as $name => $rx) {
            if (preg_match($rx, $ua, $m)) {
                return "$name {$m[1]}";
            }
        }
        return '';
    }
}
