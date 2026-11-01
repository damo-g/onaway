<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Checks a quote request and turns it into a quotes row: the same rules as the page (request.js).
 * quote.html is the source of truth for the choices; the page's payload() builds this JSON.
 *
 *   audience        "home" | "business"           company  string, business only, optional
 *   service         "cleaning" | "moving" | "delivery"
 *   size            cleaning, moving: the form's wording ("Studio", "1–2 bedroom" … "Under 2,000 sq ft" …)
 *   often           cleaning: "One time" | "Weekly" | "Every 2 weeks" | "Monthly"
 *   access          moving: "Elevator" | "Stairs only" | "Ground floor"
 *   what            delivery: "One item" | "A few pieces" | "A full load"
 *   area            cleaning: { name, region, code, outside }
 *   from, to        moving, delivery: { name, region, code, outside }
 *                   name = the typed town or postal code; region = Toronto, Peel, York, Halton or Durham
 *                   (empty when outside is true: still sendable, flagged)
 *   timing          cleaning, moving: "this-week" | "next-week" | "date"; delivery: "same-day" | "date" | "regular";
 *                   or "flexible" when only "My dates are flexible" is ticked
 *   date            "YYYY-MM-DD", when timing is "date": today or later (Toronto), at most 12 months ahead
 *   flexible        true | false (ignored with a picked date)
 *   notes           string, optional
 *   name, phone (10 digits once spaces, dashes, brackets and a leading 1 are stripped), email
 *   contact_pref    "call" | "text" | "email", optional
 *   privacy_version which privacy line was shown under Send (defaults to the current one)
 *
 * Strings are trimmed and capped. Fields a service doesn't ask for are dropped.
 * Returns [row, []] when valid, or [null, [field => code]] with code "missing" | "email" | "phone" | "date" | "invalid".
 */
final class Validator
{
    public const AUDIENCES = ['home', 'business'];
    public const SERVICES = ['cleaning', 'moving', 'delivery'];
    public const SIZES = [
        'home' => ['Studio', '1–2 bedroom', '3+ bedroom', 'House'],
        'business' => ['Under 2,000 sq ft', '2,000–10,000 sq ft', 'Larger'],
    ];
    public const OFTEN = ['One time', 'Weekly', 'Every 2 weeks', 'Monthly'];
    public const ACCESS = ['Elevator', 'Stairs only', 'Ground floor'];
    public const WHAT = ['One item', 'A few pieces', 'A full load'];
    public const TIMING = [
        'cleaning' => ['this-week', 'next-week', 'date'],
        'moving' => ['this-week', 'next-week', 'date'],
        'delivery' => ['same-day', 'date', 'regular'],
    ];
    public const REGIONS = ['Toronto', 'Peel', 'York', 'Halton', 'Durham'];
    public const CONTACT = ['call', 'text', 'email'];
    // Every privacy line the page has shown; the last is the current one
    public const PRIVACY_VERSIONS = ['2026-11-v1'];

    private const EMAIL = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u';

    public static function check(array $in, DateTimeImmutable $now, DateTimeZone $tz): array
    {
        $bad = [];
        $row = [];

        $row['audience'] = $audience = self::choice($in, 'audience', self::AUDIENCES, $bad, 'home');
        $row['company'] = $audience === 'business' ? self::text($in['company'] ?? null, 120) : null;
        $row['service'] = $service = self::choice($in, 'service', self::SERVICES, $bad);

        // The job, by service
        $row['size'] = in_array($service, ['cleaning', 'moving'], true) ? self::choice($in, 'size', self::SIZES[$audience ?? 'home'], $bad) : null;
        $row['often'] = $service === 'cleaning' ? self::choice($in, 'often', self::OFTEN, $bad) : null;
        $row['access'] = $service === 'moving' ? self::choice($in, 'access', self::ACCESS, $bad) : null;
        $row['what'] = $service === 'delivery' ? self::choice($in, 'what', self::WHAT, $bad) : null;

        // Where: one place for cleaning, From → To otherwise
        $places = $service === 'cleaning' ? ['area'] : ($service ? ['from', 'to'] : []);
        foreach (['area', 'from', 'to'] as $key) {
            $place = in_array($key, $places, true) ? self::place($in, $key, $bad) : null;
            $row["{$key}_name"] = $place['name'] ?? null;
            $row["{$key}_region"] = $place['region'] ?? null;
            $row["{$key}_code"] = $place['code'] ?? null;
            $row["{$key}_outside"] = $place['outside'] ?? false;
        }

        // When: a chip, a date, or flexible on its own
        $flexible = ($in['flexible'] ?? false) === true;
        $timing = null;
        if ($service) {
            $allowed = self::TIMING[$service];
            if ($flexible) {
                $allowed[] = 'flexible';
                $in['timing'] = self::blank($in['timing'] ?? null) ? 'flexible' : $in['timing'];
            }
            $timing = self::choice($in, 'timing', $allowed, $bad);
        }
        $row['timing'] = $timing;
        $row['timing_date'] = $timing === 'date' ? self::date($in['date'] ?? null, $now, $tz, $bad) : null;
        $row['flexible'] = $flexible && $timing !== 'date';

        // The person
        $row['notes'] = self::text($in['notes'] ?? null, 2000, true);
        $row['name'] = self::text($in['name'] ?? null, 100);
        if ($row['name'] === null || mb_strlen($row['name']) < 2) {
            $bad['name'] = 'missing';
        }
        $phone = self::text($in['phone'] ?? null, 30);
        $digits = preg_replace('/^1/', '', preg_replace('/[\s\-().+]/', '', (string) $phone));
        $row['phone'] = preg_match('/^\d{10}$/', $digits) ? $digits : null;
        if ($row['phone'] === null) {
            $bad['phone'] = $phone === null ? 'missing' : 'phone';
        }
        $email = self::text($in['email'] ?? null, 254);
        $row['email'] = $email !== null && preg_match(self::EMAIL, $email) ? $email : null;
        if ($row['email'] === null) {
            $bad['email'] = $email === null ? 'missing' : 'email';
        }
        $row['contact_pref'] = self::blank($in['contact_pref'] ?? null) ? null : self::choice($in, 'contact_pref', self::CONTACT, $bad);
        $row['privacy_version'] = self::blank($in['privacy_version'] ?? null)
            ? self::PRIVACY_VERSIONS[count(self::PRIVACY_VERSIONS) - 1]
            : self::choice($in, 'privacy_version', self::PRIVACY_VERSIONS, $bad);

        return $bad ? [null, $bad] : [$row, []];
    }

    private static function blank(mixed $value): bool
    {
        return $value === null || (is_string($value) && trim($value) === '');
    }

    // One of $allowed; absent → "missing", anything else → "invalid"
    private static function choice(array $in, string $field, array $allowed, array &$bad, ?string $default = null): ?string
    {
        $value = $in[$field] ?? $default;
        if (self::blank($value)) {
            $bad[$field] = 'missing';
            return null;
        }
        if (!is_string($value) || !in_array(trim($value), $allowed, true)) {
            $bad[$field] = 'invalid';
            return null;
        }
        return trim($value);
    }

    // Trimmed, control characters removed (line breaks kept for notes), capped; empty → null
    private static function text(mixed $value, int $max, bool $multiline = false): ?string
    {
        if (!is_string($value) && !is_int($value)) {
            return null;
        }
        $pattern = $multiline ? '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u';
        $value = trim((string) preg_replace($pattern, $multiline ? '' : ' ', (string) $value));
        $value = mb_substr($value, 0, $max);
        return $value === '' ? null : $value;
    }

    private static function place(array $in, string $field, array &$bad): ?array
    {
        $value = $in[$field] ?? null;
        if ($value === null || $value === '') {
            $bad[$field] = 'missing';
            return null;
        }
        $name = is_array($value) ? self::text($value['name'] ?? null, 80) : null;
        $outside = is_array($value) && ($value['outside'] ?? false) === true;
        $region = is_array($value) && !$outside && in_array($value['region'] ?? null, self::REGIONS, true) ? $value['region'] : null;
        if ($name === null || (!$outside && $region === null)) {
            $bad[$field] = is_array($value) && $name === null ? 'missing' : 'invalid';
            return null;
        }
        $code = self::text($value['code'] ?? null, 8);
        return ['name' => $name, 'region' => $region, 'code' => $code === null ? null : strtoupper($code), 'outside' => $outside];
    }

    // A real day, today or later (Toronto), at most 12 months ahead
    private static function date(mixed $value, DateTimeImmutable $now, DateTimeZone $tz, array &$bad): ?string
    {
        if (self::blank($value)) {
            $bad['date'] = 'missing';
            return null;
        }
        $local = $now->setTimezone($tz);
        $ok = is_string($value)
            && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)
            && checkdate((int) $m[2], (int) $m[3], (int) $m[1])
            && $value >= $local->format('Y-m-d')
            && $value <= $local->modify('+12 months')->format('Y-m-d');
        if (!$ok) {
            $bad['date'] = 'date';
            return null;
        }
        return $value;
    }
}
