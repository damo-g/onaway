<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;

// "In writing by", in Toronto time, matching the page's clock:
// 8:00 AM–6:00 PM → now + 2 hours · before 8 AM → 10 AM today · from 6 PM → 10 AM tomorrow.
// Seconds are dropped, as on the page. $by is UTC (stored); $label reads "4:15 PM today" or "10 AM tomorrow".
final class Promise
{
    private function __construct(
        public readonly DateTimeImmutable $by,
        public readonly string $label,
    ) {
    }

    public static function at(DateTimeImmutable $now, DateTimeZone $tz): self
    {
        $local = $now->setTimezone($tz);
        $hour = (int) $local->format('G');
        $local = $local->setTime($hour, (int) $local->format('i'));

        if ($hour < 8) {
            [$by, $day] = [$local->setTime(10, 0), 'today'];
        } elseif ($hour >= 18) {
            [$by, $day] = [$local->modify('+1 day')->setTime(10, 0), 'tomorrow'];
        } else {
            [$by, $day] = [$local->modify('+2 hours'), 'today'];
        }

        $time = $by->format($by->format('i') === '00' ? 'g A' : 'g:i A');
        return new self($by->setTimezone(new DateTimeZone('UTC')), "$time $day");
    }
}
