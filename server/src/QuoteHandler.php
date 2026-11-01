<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;
use JsonException;
use Throwable;

/**
 * POST /api/quote.php: same-origin JSON in, one saved row out.
 *   200 { ok: true, ref, promisedBy, promisedLabel }
 *   400 { ok: false, error: "invalid", fields: { field: "missing" | "email" | "phone" | "date" | "invalid" } }
 *   500 { ok: false, error: "server" }  (the real error goes to logs/error.log)
 * Also 405 (not POST), 403 (another origin), 415 (not JSON), 413 (over 20 KB). No CORS, ever.
 */
final class QuoteHandler
{
    public const MAX_BYTES = 20480;

    public static function run(): void
    {
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $raw = (string) stream_get_contents(fopen('php://input', 'rb'), self::MAX_BYTES + 1);
        [$status, $body, $headers] = self::handle($_SERVER, $raw, $now);

        http_response_code($status);
        header_remove('X-Powered-By');
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        foreach ($headers as $header) {
            header($header);
        }
        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /** @return array{int, array, string[]} status, body, extra headers */
    public static function handle(array $server, string $raw, DateTimeImmutable $now, ?QuoteRepository $repo = null): array
    {
        try {
            if (($server['REQUEST_METHOD'] ?? '') !== 'POST') {
                return [405, ['ok' => false, 'error' => 'method'], ['Allow: POST']];
            }
            if (!self::sameOrigin($server)) {
                return [403, ['ok' => false, 'error' => 'origin'], []];
            }
            if (!str_starts_with(strtolower(trim($server['CONTENT_TYPE'] ?? '')), 'application/json')) {
                return [415, ['ok' => false, 'error' => 'json'], []];
            }
            if ((int) ($server['CONTENT_LENGTH'] ?? 0) > self::MAX_BYTES || strlen($raw) > self::MAX_BYTES) {
                return [413, ['ok' => false, 'error' => 'too_large'], []];
            }

            try {
                $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                $input = null;
            }
            if (!is_array($input) || array_is_list($input)) {
                return [400, ['ok' => false, 'error' => 'invalid', 'fields' => (object) []], []];
            }

            $config = Config::load();
            $tz = new DateTimeZone($config['timezone'] ?: 'America/Toronto');

            [$row, $bad] = Validator::check($input, $now, $tz);
            if ($bad) {
                return [400, ['ok' => false, 'error' => 'invalid', 'fields' => $bad], []];
            }

            $promise = Promise::at($now, $tz);
            $row += [
                'promised_by' => $promise->by->format('Y-m-d H:i:s'),
                'ip' => substr((string) ($server['REMOTE_ADDR'] ?? ''), 0, 45),
                'user_agent' => mb_substr((string) ($server['HTTP_USER_AGENT'] ?? ''), 0, 255) ?: null,
            ];

            $repo ??= new QuoteRepository(Db::connect($config['db']));
            $ref = $repo->create($row, $now, $tz);

            return [200, [
                'ok' => true,
                'ref' => $ref,
                'promisedBy' => $promise->by->format('Y-m-d\TH:i:s\Z'),
                'promisedLabel' => $promise->label,
            ], []];
        } catch (Throwable $e) {
            Log::error($e);
            return [500, ['ok' => false, 'error' => 'server'], []];
        }
    }

    // Browsers send Origin (and Sec-Fetch-Site) on every POST: it must be this site.
    // Tools like curl send neither; they still face every other check.
    private static function sameOrigin(array $server): bool
    {
        $site = $server['HTTP_SEC_FETCH_SITE'] ?? null;
        if ($site !== null && $site !== 'same-origin') {
            return false;
        }
        $origin = $server['HTTP_ORIGIN'] ?? null;
        return $origin === null || $origin === 'https://' . ($server['HTTP_HOST'] ?? '');
    }
}
