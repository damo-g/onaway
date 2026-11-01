<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;

// ONA-YYMM-NNNN: the Toronto year and month at submission, then the row id padded to 4 (5+ as it grows).
// The id never resets, so the reference is unique by construction. Example: ONA-2610-0042.
final class Reference
{
    public static function make(int $id, DateTimeImmutable $at, DateTimeZone $tz): string
    {
        return sprintf('ONA-%s-%04d', $at->setTimezone($tz)->format('ym'), $id);
    }
}
