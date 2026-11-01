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
 * After a save the visitor gets the answer at once; the emails go out after the response is closed.
 */
final class QuoteHandler
{
    public const MAX_BYTES = 20480;

    public static function run(): void
    {
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $raw = (string) stream_get_contents(fopen('php://input', 'rb'), self::MAX_BYTES + 1);
        [$status, $body, $headers, $after] = self::handle($_SERVER, $raw, $now) + [3 => null];
        $json = (string) json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        http_response_code($status);
        header_remove('X-Powered-By');
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        foreach ($headers as $header) {
            header($header);
        }
        $finish = function_exists('litespeed_finish_request') ? 'litespeed_finish_request' : (function_exists('fastcgi_finish_request') ? 'fastcgi_finish_request' : null);
        if ($after && !$finish) {
            // no way to close the response early: tell the browser where it ends
            header('Content-Length: ' . strlen($json));
            header('Connection: close');
        }
        echo $json;

        if ($after) {
            // Close the response, then send: a slow mail server never keeps the visitor waiting
            ignore_user_abort(true);
            if ($finish) {
                $finish();
            } else {
                @ob_end_flush();
                flush();
            }
            @set_time_limit(60);
            try {
                $after();
            } catch (Throwable $e) {
                Log::error($e);
            }
        }
    }

    /** @return array{0: int, 1: array, 2: string[], 3?: callable} status, body, extra headers, then what runs after the response */
    public static function handle(array $server, string $raw, DateTimeImmutable $now, ?QuoteRepository $repo = null, ?Mailer $mailer = null): array
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
            ['id' => $id, 'ref' => $ref] = $repo->create($row, $now, $tz);

            $notifier = new Notifier($repo, $mailer ?? new Mailer($config['smtp'] ?? []), $config, $tz);
            $after = static fn () => $notifier->notify($id, $ref, $row, $promise->label, $now);

            return [200, [
                'ok' => true,
                'ref' => $ref,
                'promisedBy' => $promise->by->format('Y-m-d\TH:i:s\Z'),
                'promisedLabel' => $promise->label,
            ], [], $after];
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
