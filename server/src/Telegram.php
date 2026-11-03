<?php
declare(strict_types=1);

namespace Onaway;

use RuntimeException;

// Telegram alerts to the team group through the Bot API (config.php → telegram.bot_token, telegram.chat_id).
// send() posts one HTML message with a 5 s timeout and throws on any failure; the token never reaches an error.
// With both values empty Telegram is simply off (enabled() is false).
class Telegram
{
    public function __construct(private array $config)
    {
    }

    public function enabled(): bool
    {
        return trim((string) ($this->config['bot_token'] ?? '')) !== '' || trim((string) ($this->config['chat_id'] ?? '')) !== '';
    }

    public function send(string $html): void
    {
        $token = trim((string) ($this->config['bot_token'] ?? ''));
        $chat = trim((string) ($this->config['chat_id'] ?? ''));
        if ($token === '' || $chat === '') {
            throw new RuntimeException('Telegram is half configured: set both bot_token and chat_id in config.php');
        }
        $url = 'https://api.telegram.org/bot' . rawurlencode($token) . '/sendMessage';
        $fields = ['chat_id' => $chat, 'text' => $html, 'parse_mode' => 'HTML', 'disable_web_page_preview' => 'true'];

        [$status, $body, $error] = $this->post($url, $fields);
        $data = is_string($body) ? json_decode($body, true) : null;
        if (!is_array($data) || ($data['ok'] ?? false) !== true) {
            $why = is_array($data) && isset($data['description']) ? (string) $data['description'] : ($error ?: "HTTP {$status}");
            throw new RuntimeException('Telegram: ' . str_replace($token, '[token]', $why));
        }
    }

    // Escapes a value for Telegram's HTML: only <, > and & matter there (quotes stay as they are)
    public static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_NOQUOTES, 'UTF-8');
    }

    /** @return array{0: int, 1: ?string, 2: string} status, body, transport error */
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
            return [(int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE), is_string($body) ? $body : null, curl_error($ch)];
        }
        $body = @file_get_contents($url, false, stream_context_create(['http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query($fields),
            'timeout' => 5,
            'ignore_errors' => true,
        ]]));
        $status = isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m) ? (int) $m[1] : 0;
        return [$status, is_string($body) ? $body : null, $body === false ? 'request failed' : ''];
    }
}
