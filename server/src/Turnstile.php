<?php
declare(strict_types=1);

namespace Onaway;

use RuntimeException;

// Cloudflare Turnstile, checked on the server (config.php → turnstile.secret; an empty secret turns it off).
// verify() is true when Cloudflare says the token is good, false when it says no (a bad or spent token, or a
// wrong secret), and throws when Cloudflare can't be reached (connect 3 s, 5 s in all). Tokens are single use.
class Turnstile
{
    public const URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function __construct(private array $config = [])
    {
    }

    public function enabled(): bool
    {
        return trim((string) ($this->config['secret'] ?? '')) !== '';
    }

    public function verify(string $token, string $ip): bool
    {
        $token = trim($token);
        if ($token === '' || strlen($token) > 2048) {
            return false;
        }
        $fields = ['secret' => trim((string) $this->config['secret']), 'response' => $token];
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            $fields['remoteip'] = $ip;
        }
        [$status, $body] = $this->post(self::URL, $fields);
        $data = is_string($body) ? json_decode($body, true) : null;
        if (!is_array($data) || !array_key_exists('success', $data)) {
            throw new RuntimeException("Turnstile: no answer (HTTP $status)");
        }
        if ($data['success'] !== true) {
            // e.g. invalid-input-secret (a wrong secret), timeout-or-duplicate (a spent token)
            $codes = implode(', ', array_map('strval', (array) ($data['error-codes'] ?? [])));
            Log::error('Turnstile: ' . ($codes ?: 'failed'));
        }
        return $data['success'] === true;
    }

    /** @return array{0: int, 1: ?string} status, body */
    protected function post(string $url, array $fields): array
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => http_build_query($fields),
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_TIMEOUT => 5,
            ]);
            $body = curl_exec($ch);
            return [(int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE), is_string($body) ? $body : null];
        }
        $body = @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query($fields),
            'timeout' => 5,
            'ignore_errors' => true,
        ]]));
        return [is_string($body) ? 200 : 0, is_string($body) ? $body : null];
    }
}
