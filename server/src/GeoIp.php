<?php
declare(strict_types=1);

namespace Onaway;

use Throwable;

// An approximate place for the visitor's IP: "Mississauga, Ontario, Canada". City level at best, and often
// off on mobile data, so the team email labels it "approx.". Runs after the response, 3 s at most; any
// failure just gives ''. Not stored. Asks ipbot first and falls back to freeipapi (both keyless, 60 a minute).
// config.php → geoip.url: absent or the old freeipapi default = that pair; '' = off; any other URL = only that one
// ({ip} is replaced). geoip.token is sent as a Bearer header.
class GeoIp
{
    public const DEFAULT_URL = 'https://api.ipbot.com/{ip}';
    public const FALLBACK_URL = 'https://free.freeipapi.com/api/v1/json/{ip}';

    public function __construct(private array $config = [])
    {
    }

    public function locate(string $ip): string
    {
        $url = array_key_exists('url', $this->config) ? (string) $this->config['url'] : self::DEFAULT_URL;
        $urls = in_array($url, [self::DEFAULT_URL, self::FALLBACK_URL], true) ? [self::DEFAULT_URL, self::FALLBACK_URL] : [$url];
        if ($url === '' || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return '';
        }
        foreach ($urls as $each) {
            try {
                $json = $this->fetch(str_replace('{ip}', rawurlencode($ip), $each));
                $data = $json === null ? null : json_decode($json, true);
                $place = is_array($data) ? self::place($data) : '';
                if ($place !== '') {
                    return $place;
                }
            } catch (Throwable $e) {
                Log::error($e, ['step' => 'geoip', 'url' => parse_url($each, PHP_URL_HOST)]);
            }
        }
        return '';
    }

    // Reads the usual field names of the common providers (ipbot nests them under "location"; freeipapi,
    // ipwho.is, ipapi.co and ipinfo keep them at the top)
    public static function place(array $d): string
    {
        if (isset($d['location']) && is_array($d['location'])) {
            $d = $d['location'] + $d;
        }
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

    protected function fetch(string $url): ?string
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
