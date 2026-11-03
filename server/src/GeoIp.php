<?php
declare(strict_types=1);

namespace Onaway;

use Throwable;

// An approximate place for the visitor's IP: "Mississauga, Ontario, Canada". City level at best, and often
// off on mobile data, so the team email labels it "approx.". Runs after the response, 3 s at most; any
// failure just gives ''. Not stored. config.php → geoip.url ({ip} is replaced; '' turns it off), geoip.token.
final class GeoIp
{
    public const DEFAULT_URL = 'https://free.freeipapi.com/api/v1/json/{ip}';

    public function __construct(private array $config = [])
    {
    }

    public function locate(string $ip): string
    {
        $url = array_key_exists('url', $this->config) ? (string) $this->config['url'] : self::DEFAULT_URL;
        if ($url === '' || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return '';
        }
        try {
            $json = $this->fetch(str_replace('{ip}', rawurlencode($ip), $url));
            $data = $json === null ? null : json_decode($json, true);
            return is_array($data) ? self::place($data) : '';
        } catch (Throwable $e) {
            Log::error($e, ['step' => 'geoip']);
            return '';
        }
    }

    // Reads the usual field names of the common providers (freeipapi, ipwho.is, ipapi.co, ipinfo)
    public static function place(array $d): string
    {
        $pick = static function (array $keys) use ($d): string {
            foreach ($keys as $k) {
                if (isset($d[$k]) && is_string($d[$k]) && trim($d[$k]) !== '' && $d[$k] !== '-') {
                    return Mailer::line(mb_substr($d[$k], 0, 60));
                }
            }
            return '';
        };
        $parts = [
            $pick(['cityName', 'city']),
            $pick(['regionName', 'region']),
            $pick(['countryName', 'country_name', 'country']),
        ];
        return implode(', ', array_unique(array_filter($parts)));
    }

    private function fetch(string $url): ?string
    {
        $headers = ['Accept: application/json'];
        if (!empty($this->config['token'])) {
            $headers[] = 'Authorization: Bearer ' . $this->config['token'];
        }
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_MAXREDIRS => 2,
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_TIMEOUT => 3,
                CURLOPT_HTTPHEADER => $headers,
            ]);
            $body = curl_exec($ch);
            $ok = is_string($body) && curl_getinfo($ch, CURLINFO_RESPONSE_CODE) === 200;
            return $ok ? $body : null;
        }
        $body = @file_get_contents($url, false, stream_context_create(['http' => [
            'timeout' => 3,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => false,
        ]]));
        return is_string($body) ? $body : null;
    }
}
