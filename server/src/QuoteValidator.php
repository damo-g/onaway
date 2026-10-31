<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Checks a quote request and turns it into a quotes row. quote.html is the source of truth for the choices.
 *
 * The JSON the page sends:
 *   audience  "home" | "business"           company  string, business only, optional
 *   service   "cleaning" | "moving" | "delivery"
 *   size      cleaning, moving: the form's wording ("Studio", "1–2 bedroom" … "Under 2,000 sq ft" …)
 *   often     cleaning: "One time" | "Weekly" | "Every 2 weeks" | "Monthly"
 *   access    moving: "Elevator" | "Stairs only" | "Ground floor"
 *   what      delivery: "One item" | "A few pieces" | "A full load"
 *   area      cleaning: { name, region, code, outside }
 *   from, to  moving, delivery: { name, region, code, outside }
 *             name = the typed town or postal code; region = Toronto, Peel, York, Halton or Durham
 *             (empty when outside is true)
 *   timing    cleaning, moving: "this-week" | "next-week" | "date"; delivery: "same-day" | "date" | "regular"
 *   date      "YYYY-MM-DD", when timing is "date" (today or later, Toronto)
 *   flexible  true | false (ignored with a picked date)
 *   notes     string, optional
 *   name, phone (10 digits, a leading 1 allowed), email
 *   contact   "call" | "text" | "email", optional
 *
 * Strings are trimmed and capped. Fields a service doesn't ask for are dropped.
 * Returns [row, []] when valid, or [null, [field, …]] naming every field that needs fixing.
 */
final class QuoteValidator
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

    // The same rules as the page (request.js RX)
    private const EMAIL = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u';

    public static function check(array $in, DateTimeImmutable $now, DateTimeZone $tz): array
    {
        $bad = [];
        $row = [];

        $audience = self::choice($in['audience'] ?? 'home', self::AUDIENCES);
        $audience ?? self::fail($bad, 'audience');
        $row['audience'] = $audience;
        $row['company'] = $audience === 'business' ? self::text($in['company'] ?? null, 120) : null;

        $service = self::choice($in['service'] ?? null, self::SERVICES);
        $service ?? self::fail($bad, 'service');
        $row['service'] = $service;

        // The job, by service
        $row['size'] = $row['often'] = $row['access'] = $row['what'] = null;
        if ($service === 'cleaning' || $service === 'moving') {
            $row['size'] = self::choice($in['size'] ?? null, self::SIZES[$audience ?? 'home']) ?? self::fail($bad, 'size');
        }
        if ($service === 'cleaning') {
            $row['often'] = self::choice($in['often'] ?? null, self::OFTEN) ?? self::fail($bad, 'often');
        }
        if ($service === 'moving') {
            $row['access'] = self::choice($in['access'] ?? null, self::ACCESS) ?? self::fail($bad, 'access');
        }
        if ($service === 'delivery') {
            $row['what'] = self::choice($in['what'] ?? null, self::WHAT) ?? self::fail($bad, 'what');
        }

        // Where: one place for cleaning, from → to otherwise
        $places = $service === 'cleaning' ? ['area'] : ($service ? ['from', 'to'] : []);
        foreach (['area', 'from', 'to'] as $key) {
            $place = in_array($key, $places, true) ? self::place($in[$key] ?? null) : null;
            if (in_array($key, $places, true) && $place === null) {
                $bad[] = $key;
            }
            $row["{$key}_name"] = $place['name'] ?? null;
            $row["{$key}_region"] = $place['region'] ?? null;
            $row["{$key}_code"] = $place['code'] ?? null;
            $row["{$key}_outside"] = $place['outside'] ?? false;
        }

        // When
        $timing = $service ? self::choice($in['timing'] ?? null, self::TIMING[$service]) : null;
        $timing ?? self::fail($bad, 'timing');
        $row['timing'] = $timing;
        $row['timing_date'] = null;
        if ($timing === 'date') {
            $row['timing_date'] = self::date($in['date'] ?? null, $now, $tz) ?? self::fail($bad, 'date');
        }
        $row['flexible'] = $timing !== 'date' && ($in['flexible'] ?? false) === true;

        // The person
        $row['notes'] = self::text($in['notes'] ?? null, 2000, true);
        $row['name'] = self::text($in['name'] ?? null, 100);
        if ($row['name'] === null || mb_strlen($row['name']) < 2) {
            $bad[] = 'name';
        }
        $digits = preg_replace('/\D/', '', (string) self::text($in['phone'] ?? null, 30));
        $digits = strlen($digits) === 11 && $digits[0] === '1' ? substr($digits, 1) : $digits;
        $row['phone'] = strlen($digits) === 10 ? $digits : self::fail($bad, 'phone');
        $email = self::text($in['email'] ?? null, 254);
        $row['email'] = $email !== null && preg_match(self::EMAIL, $email) ? $email : self::fail($bad, 'email');
        $contact = $in['contact'] ?? null;
        $row['contact_pref'] = $contact === null || $contact === '' ? null : (self::choice($contact, self::CONTACT) ?? self::fail($bad, 'contact'));

        return $bad ? [null, array_values(array_unique($bad))] : [$row, []];
    }

    private static function fail(array &$bad, string $field): ?string
    {
        $bad[] = $field;
        return null;
    }

    private static function choice(mixed $value, array $allowed): ?string
    {
        return is_string($value) && in_array(trim($value), $allowed, true) ? trim($value) : null;
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

    private static function place(mixed $value): ?array
    {
        if (!is_array($value)) {
            return null;
        }
        $name = self::text($value['name'] ?? null, 80);
        $outside = ($value['outside'] ?? false) === true;
        $region = $outside ? null : self::choice($value['region'] ?? null, self::REGIONS);
        if ($name === null || (!$outside && $region === null)) {
            return null;
        }
        $code = self::text($value['code'] ?? null, 8);
        return ['name' => $name, 'region' => $region, 'code' => $code === null ? null : strtoupper($code), 'outside' => $outside];
    }

    // A real day, today or later (Toronto), at most a year out
    private static function date(mixed $value, DateTimeImmutable $now, DateTimeZone $tz): ?string
    {
        if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return null;
        }
        $today = $now->setTimezone($tz)->format('Y-m-d');
        $limit = $now->setTimezone($tz)->modify('+1 year')->format('Y-m-d');
        return $value >= $today && $value <= $limit ? $value : null;
    }
}
