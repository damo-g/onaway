<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;

// The two emails for a saved request (context doc §7). Each is ['to', 'replyTo', 'subject', 'html', 'text'].
//   team()      to quotes@, reply-to the customer: every field, grouped Job · Places · When · Contact · Notes
//   customer()  to the customer: the confirmation and nothing else
final class QuoteEmails
{
    private const SERVICE = ['cleaning' => 'Cleaning', 'moving' => 'Moving', 'delivery' => 'Delivery'];
    private const REGION = ['Toronto' => 'City of Toronto', 'Peel' => 'Peel', 'York' => 'York', 'Halton' => 'Halton', 'Durham' => 'Durham'];
    private const TIMING = ['this-week' => 'This week', 'next-week' => 'Next week', 'same-day' => 'Same day', 'regular' => 'Regular drop-offs', 'flexible' => 'Flexible'];
    private const CONTACT = ['call' => 'Call', 'text' => 'Text', 'email' => 'Email'];

    private const PAPER = '#F7F2E7';
    private const CARBON = '#202521';
    private const YELLOW = '#E4BB3F';
    private const RUST = '#A9503E';
    private const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    private const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

    public function __construct(
        private array $row,
        private string $ref,
        private string $promised,
        private DateTimeImmutable $now,
        private DateTimeZone $tz,
        private string $phone,
        private string $inbox,
        private array $visitor = [],
    ) {
    }

    public function team(): array
    {
        $r = $this->row;
        $service = self::SERVICE[$r['service']];
        $groups = [
            'Job' => [
                'Service' => $service,
                'For a' => $r['audience'] === 'business' ? 'Business' : 'Home',
                'Company' => $r['company'],
                'Size' => $r['size'],
                'How often' => $r['often'],
                'Getting in and out' => $r['access'],
                'What’s going' => $r['what'],
            ],
            'Places' => $r['service'] === 'cleaning'
                ? ['Where' => $this->place('area')]
                : ['From' => $this->place('from'), 'To' => $this->place('to')],
            'When' => ['When' => $this->when()],
            'Contact' => [
                'Name' => $r['name'],
                'Phone' => self::phone($r['phone']),
                'Email' => $r['email'],
                'Prefers' => self::CONTACT[$r['contact_pref'] ?? ''] ?? null,
            ],
            'Notes' => ['Notes' => $r['notes'] ?? '—'],
            'Sent from' => [
                'Device' => $this->visitor['device'] ?? null,
                'IP' => $this->visitor['ip'] ?? null,
                'Location' => !empty($this->visitor['location']) ? $this->visitor['location'] . ' (approx., from IP)' : null,
            ],
        ];
        // Times carry their zone (EST / EDT), so they read right from anywhere
        $promisedAt = empty($r['promised_by']) ? null : new DateTimeImmutable($r['promised_by'], new DateTimeZone('UTC'));
        $top = [
            'Ref' => $this->ref,
            'Received' => $this->stamp($this->now),
            'Quote by' => $promisedAt ? $this->stamp($promisedAt) : $this->promised,
        ];
        $outside = $this->outside();

        // Plain text: labels padded into a column
        $text = '';
        foreach (['' => $top] + $groups as $title => $rows) {
            $text .= $title === '' ? '' : "\n" . strtoupper($title) . "\n";
            foreach (array_filter($rows, static fn ($v) => $v !== null && $v !== '') as $label => $value) {
                $text .= str_pad(strtoupper($label), 20) . str_replace("\n", "\n" . str_repeat(' ', 20), $value) . "\n";
            }
        }
        if ($outside) {
            $text = "OUTSIDE GTA: {$outside}\n\n" . $text;
        }

        // HTML: the same, as a table with mono labels
        $rowsHtml = '';
        foreach (['' => $top] + $groups as $title => $rows) {
            if ($title !== '') {
                $rowsHtml .= '<tr><td colspan="2" style="padding:21px 0 8px;font:600 12px/1.4 ' . self::MONO . ';letter-spacing:0.12em;text-transform:uppercase;color:' . self::CARBON . ';border-bottom:1px solid #d6d1c6;">' . self::e($title) . '</td></tr>';
            }
            foreach (array_filter($rows, static fn ($v) => $v !== null && $v !== '') as $label => $value) {
                $rowsHtml .= '<tr>'
                    . '<td valign="top" style="width:150px;padding:8px 13px 8px 0;font:12px/1.5 ' . self::MONO . ';letter-spacing:0.08em;text-transform:uppercase;color:#6b6e69;">' . self::e($label) . '</td>'
                    . '<td valign="top" style="padding:8px 0;font:16px/1.45 ' . self::SANS . ';color:' . self::CARBON . ';">' . nl2br(self::e($value)) . '</td>'
                    . '</tr>';
            }
        }
        $banner = $outside
            ? '<p style="margin:0 0 21px;padding:13px;border:2px solid ' . self::RUST . ';font:600 14px/1.4 ' . self::MONO . ';letter-spacing:0.08em;color:' . self::RUST . ';">OUTSIDE GTA · ' . self::e($outside) . '</p>'
            : '';
        $html = $this->page(
            "New quote request {$this->ref}",
            $banner . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' . $rowsHtml . '</table>'
        );

        return [
            'to' => [$this->inbox, 'ONAWAY quotes'],
            'replyTo' => [$r['email'], $r['name']],
            'subject' => "New quote request [{$this->ref}] · {$service} · {$this->route()}",
            'html' => $html,
            'text' => trim($text) . "\n",
        ];
    }

    public function customer(): array
    {
        $r = $this->row;
        $first = Mailer::line(explode(' ', $r['name'])[0]);
        $tel = '+1' . preg_replace('/\D/', '', preg_replace('/^\+?1/', '', $this->phone));

        $text = "Got it, {$first}. Your request {$this->ref} is in. You’ll have your quote in writing by {$this->promised}. Rather talk? Call {$this->phone}.\n";

        $p = 'margin:0 0 21px;font:18px/1.55 ' . self::SANS . ';color:' . self::CARBON . ';';
        $body = '<p style="' . $p . '">Got it, ' . self::e($first) . '.</p>'
            . '<p style="' . $p . '">Your request <span style="font-family:' . self::MONO . ';font-size:16px;">' . self::e($this->ref) . '</span> is in. You’ll have your quote in writing by <b>' . self::e($this->promised) . '</b>.</p>'
            . '<p style="' . $p . '">Rather talk? Call <a href="tel:' . self::e($tel) . '" style="color:' . self::CARBON . ';text-decoration:underline;white-space:nowrap;">' . self::e($this->phone) . '</a>.</p>'
            // the ticket line: a dashed tear, the yellow square, the reference in mono
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:34px;border-top:1.5px dashed #b9b4a9;"><tr>'
            . '<td style="padding:13px 0 0;font:12px/1.4 ' . self::MONO . ';letter-spacing:0.12em;text-transform:uppercase;color:' . self::CARBON . ';">'
            . '<span style="display:inline-block;width:8px;height:8px;margin-right:8px;background:' . self::YELLOW . ';vertical-align:1px;"></span>'
            . 'Ref ' . self::e($this->ref) . '</td></tr></table>';

        return [
            'to' => [$r['email'], $r['name']],
            'replyTo' => null,
            'subject' => "We've got your request [{$this->ref}]",
            'html' => $this->page("We've got your request", $body),
            'text' => $text,
        ];
    }

    // Paper page, 560 wide, web-safe fonts, no images
    private function page(string $title, string $inner): string
    {
        return '<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>' . self::e($title) . '</title></head>'
            . '<body style="margin:0;padding:0;background:' . self::PAPER . ';">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . self::PAPER . ';"><tr><td align="center" style="padding:34px 20px;">'
            . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td align="left">'
            . $inner
            . '</td></tr></table></td></tr></table></body></html>';
    }

    // "Mississauga" or "Mississauga → Oakville"
    private function route(): string
    {
        $r = $this->row;
        return Mailer::line($r['service'] === 'cleaning' ? (string) $r['area_name'] : "{$r['from_name']} → {$r['to_name']}");
    }

    // "Mississauga · L5B · Peel" or "K7L · OUTSIDE GTA"
    private function place(string $key): string
    {
        $r = $this->row;
        $parts = [$r["{$key}_name"]];
        if ($r["{$key}_code"] && $r["{$key}_code"] !== $r["{$key}_name"]) {
            $parts[] = $r["{$key}_code"];
        }
        $parts[] = $r["{$key}_outside"] ? 'OUTSIDE GTA' : (self::REGION[$r["{$key}_region"]] ?? $r["{$key}_region"]);
        return implode(' · ', array_filter($parts));
    }

    private function outside(): string
    {
        $keys = $this->row['service'] === 'cleaning' ? ['area'] : ['from', 'to'];
        $out = array_filter($keys, fn ($k) => $this->row["{$k}_outside"]);
        return implode(', ', array_map(fn ($k) => ($k === 'area' ? '' : ucfirst($k) . ' ') . $this->row["{$k}_name"], $out));
    }

    private function when(): string
    {
        $r = $this->row;
        $when = $r['timing'] === 'date'
            ? (new DateTimeImmutable($r['timing_date'], $this->tz))->format('D, M j, Y')
            : self::TIMING[$r['timing']] ?? $r['timing'];
        return $when . ($r['flexible'] && $r['timing'] !== 'flexible' ? ' · flexible' : '');
    }

    // "Mon, Nov 2, 4:15 PM EST"
    private function stamp(DateTimeImmutable $at): string
    {
        return $at->setTimezone($this->tz)->format('D, M j, g:i A T');
    }

    private static function phone(string $digits): string
    {
        return sprintf('(%s) %s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6));
    }

    private static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
}
