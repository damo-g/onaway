<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;
use Onaway\EmailTicket as Tk;

// The two emails for a saved request (context doc §7), drawn as tickets (EM-04). Each is ['to', 'replyTo', 'subject', 'html', 'text'].
//   team()      to quotes@, reply-to the customer: the light Board ticket, every field, the ref in dot matrix
//   customer()  to the customer: the confirmation words, then the Headline receipt with the W sealed on the tear
final class QuoteEmails
{
    private const SERVICE = ['cleaning' => 'Cleaning', 'moving' => 'Moving', 'delivery' => 'Delivery'];
    private const REGION = ['Toronto' => 'City of Toronto', 'Peel' => 'Peel', 'York' => 'York', 'Halton' => 'Halton', 'Durham' => 'Durham'];
    private const TIMING = ['this-week' => 'This week', 'next-week' => 'Next week', 'same-day' => 'Same day', 'regular' => 'Regular drop-offs', 'flexible' => 'Flexible'];
    private const CONTACT = ['call' => 'Call', 'text' => 'Text', 'email' => 'Email'];

    private Tk $tk;

    public function __construct(
        private array $row,
        private string $ref,
        private string $promised,
        private DateTimeImmutable $now,
        private DateTimeZone $tz,
        private string $phone,
        private string $inbox,
        private array $visitor = [],
        string $assets = 'https://onaway.ca/email/',
    ) {
        $this->tk = new Tk($assets);
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
        $promisedAt = $this->promisedAt();
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
            foreach (self::filled($rows) as $label => $value) {
                $text .= str_pad(strtoupper($label), 20) . str_replace("\n", "\n" . str_repeat(' ', 20), $value) . "\n";
            }
        }
        if ($outside) {
            $text = "OUTSIDE GTA: {$outside}\n\n" . $text;
        }

        // HTML: the light Board ticket on Ticket Paper, sub-headings in Instrument Sans caps, no stub
        $row = static fn (string $label, string $value, bool $strong = false) => '<tr>'
            . '<td valign="top" width="34%" style="padding:13px 13px 13px 0;border-top:1px solid ' . Tk::LIGHT_RULE . ';' . Tk::mono(11, Tk::MUTED) . '">' . Tk::e($label) . '</td>'
            . '<td valign="top" style="padding:13px 0;border-top:1px solid ' . Tk::LIGHT_RULE . ';' . Tk::sans(16, Tk::CARBON, $strong ? 'font-weight:700;' : '') . '">' . Tk::nb(nl2br(Tk::e($value))) . '</td></tr>';
        $sub = static fn (string $title) => '<tr><td colspan="2" style="padding:34px 0 8px;' . Tk::sans(20, Tk::CARBON, 'font-weight:600;line-height:1.1;text-transform:uppercase;letter-spacing:0.02em;') . '">' . Tk::e($title) . '</td></tr>';
        $rows = $row('Route', $this->route(), true) . $row('Received', $top['Received']) . $row('Quote by', $top['Quote by']);
        foreach ($groups as $title => $list) {
            $list = self::filled($list);
            if ($list) {
                $rows .= $sub($title) . implode('', array_map($row, array_keys($list), $list));
            }
        }
        // The due chip: a double Rust hairline, wide tracking, no fill
        $chip = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="border-collapse:separate;"><tr><td style="padding:2px;border:1px solid ' . Tk::RUST . ';">'
            . '<div style="padding:4px 10px;border:1px solid ' . Tk::RUST . ';' . Tk::mono(10, Tk::RUST, 'font-weight:600;letter-spacing:0.2em;white-space:nowrap;') . '">' . Tk::e($this->due()) . '</div></td></tr></table>';
        $header = Tk::table('<tr><td width="26" valign="middle">' . $this->tk->img('w-carbon.png', 26, 26) . '</td>'
            . '<td valign="middle" style="padding-left:13px;' . Tk::mono(11, Tk::MUTED) . '">ONAWAY · Arrivals · ' . Tk::e($service) . '</td>'
            . '<td align="right" valign="middle">' . $chip . '</td></tr>');
        $banner = $outside
            ? Tk::gap(13) . '<div style="padding:8px 13px;border:1px solid ' . Tk::RUST . ';' . Tk::mono(12, Tk::RUST, 'font-weight:600;') . '">Outside GTA · ' . Tk::e($outside) . '</div>'
            : '';
        $body = '<div style="padding:21px 21px 34px;">' . $header . Tk::gap(21)
            . '<div style="display:inline-block;padding:13px;background:' . Tk::FACE . ';border-radius:3px;">' . Tk::matrix($this->ref) . '</div>'
            . $banner . Tk::gap(21) . Tk::table($rows) . '</div>';
        $html = Tk::page(
            "New quote request {$this->ref}",
            Tk::FACE,
            Tk::preheader("{$service} · {$this->route()} · " . strtolower($this->due())) . $this->tk->ticket([['html' => $body, 'bg' => Tk::PAPER]], Tk::FACE),
            560
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
        $service = self::SERVICE[$r['service']];

        $text = "Got it, {$first}. Your request {$this->ref} is in. You’ll have your quote in writing by {$this->promised}. Rather talk? Call {$this->phone}.\n";

        // The words, unchanged
        $p = 'margin:0 0 21px;' . Tk::sans(17, Tk::CARBON, 'line-height:1.55;');
        $words = '<p style="' . $p . '">Got it, ' . Tk::e($first) . '.</p>'
            . '<p style="' . $p . '">Your request <span style="font-family:' . Tk::MONO . ';font-size:15px;white-space:nowrap;">' . Tk::e($this->ref) . '</span> is in. You’ll have your quote in writing by <b>' . Tk::nb(Tk::e($this->promised)) . '</b>.</p>';
        $call = '<p style="' . $p . 'margin:0;">Rather talk? Call <a href="tel:' . Tk::e($tel) . '" style="color:' . Tk::CARBON . ';text-decoration:underline;white-space:nowrap;">' . Tk::e($this->phone) . '</a>.</p>';

        // The Headline receipt: wordmark and the request's date, the job as a headline, a two-column grid, the promise
        $local = $this->now->setTimezone($this->tz);
        $meta = '<div style="' . Tk::mono(11, Tk::MUTED, 'text-align:right;line-height:1.5;') . '"><span style="white-space:nowrap;">' . $local->format('D, M j, Y') . '</span><br><span style="white-space:nowrap;">' . $local->format('g:i A T') . '</span></div>';
        $route = $r['service'] === 'cleaning'
            ? Tk::e($r['area_name'])
            : Tk::e($r['from_name']) . ' <span style="color:' . Tk::RUST . ';">→</span> ' . Tk::e($r['to_name']);
        $stack = static fn (string $label, string $value) => '<div style="' . Tk::mono(11, Tk::MUTED) . '">' . Tk::e($label) . '</div><div style="margin-top:4px;' . Tk::sans(16, Tk::CARBON, 'font-weight:600;') . '">' . Tk::nb(Tk::e($value)) . '</div>';
        $body = '<div style="padding:26px 21px 0;">' . Tk::table('<tr><td valign="middle">' . $this->tk->img('wordmark-carbon.png', 96, 18, 'ONAWAY', Tk::sans(16, Tk::CARBON, 'font-weight:700;letter-spacing:0.06em;')) . '</td><td valign="middle" align="right">' . $meta . '</td></tr>') . '</div>'
            . '<div style="padding:34px 21px;">'
            . '<div style="' . Tk::sans(15, Tk::MUTED, 'font-weight:600;') . '">Your request</div>'
            . '<div style="margin-top:8px;' . Tk::sans(30, Tk::CARBON, 'font-weight:600;line-height:1.1;letter-spacing:-0.015em;') . '">' . Tk::e($service) . ', ' . $route . '</div>'
            . Tk::gap(21)
            . Tk::table('<tr><td valign="top" width="50%" style="padding:13px 13px 0 0;border-top:1px solid ' . Tk::CARBON . ';">' . $stack('When', $this->whenShort()) . '</td>'
                . '<td valign="top" width="50%" style="padding:13px 0 0;border-top:1px solid ' . Tk::CARBON . ';">' . $stack('For a', $r['audience'] === 'business' ? 'Business' : 'Home') . '</td></tr>')
            . Tk::gap(34)
            . '<div style="padding:21px 0 0;border-top:1px dashed ' . Tk::RULE . ';"><div style="' . Tk::mono(11, Tk::CARBON, 'font-weight:700;') . '">' . Tk::square() . 'Quote in writing by</div>'
            . '<div style="margin-top:8px;' . Tk::sans(30, Tk::CARBON, 'font-weight:600;line-height:1.1;letter-spacing:-0.01em;') . '">' . Tk::nb(Tk::e($this->promised)) . '</div></div></div>';
        // The stub: the ref on the left, the barcode on the right; the W is sealed on the tear above it
        $stub = '<div style="padding:21px;">' . Tk::table('<tr><td valign="middle" style="' . Tk::mono(12, Tk::CARBON, 'font-weight:600;white-space:nowrap;') . '">Ref ' . Tk::e($this->ref) . '</td><td valign="middle" align="right">' . Tk::barcode($this->ref) . '</td></tr>') . '</div>';

        $html = Tk::page(
            "We've got your request",
            Tk::PAPER,
            Tk::preheader("Your quote is coming by {$this->promised}.") . $words . Tk::gap(13)
                . $this->tk->ticket([['html' => $body, 'bg' => Tk::FACE], ['html' => $stub, 'bg' => Tk::STUB]], Tk::PAPER, true)
                . Tk::gap(34) . $call,
            480
        );

        return [
            'to' => [$r['email'], $r['name']],
            'replyTo' => null,
            'subject' => "We've got your request [{$this->ref}]",
            'html' => $html,
            'text' => $text,
        ];
    }

    /**
     * The Trello card, by email to the board's private address (context doc §7). Plain text: the subject becomes
     * the title, its #tags the labels (they must match label names on the board; spaces become underscores), the
     * body the card's Markdown description. Anything the customer typed loses its # and @ in the subject, and their
     * notes are quoted, so they can never add a label or a member.
     */
    public function board(string $address): array
    {
        $r = $this->row;
        $service = self::SERVICE[$r['service']];
        $clean = static fn (string $v) => trim((string) preg_replace('/[#@]+/', '', Mailer::line($v)));
        $first = $clean(explode(' ', $r['name'])[0]);
        $tags = '#' . $service . ($this->outside() ? ' #Outside_GTA' : '');
        $subject = "{$this->ref} · {$service} · " . $clean($this->route()) . ($first !== '' ? " · {$first}" : '') . " {$tags}";

        $promisedAt = $this->promisedAt();
        $md = static fn (string $label, ?string $value) => $value === null || $value === '' ? '' : "- **{$label}:** " . Mailer::line($value) . "\n";
        $text = "**Ref:** {$this->ref}  \n**Received:** {$this->stamp($this->now)}  \n**Quote by:** " . ($promisedAt ? $this->stamp($promisedAt) : $this->promised) . "\n";
        if ($outside = $this->outside()) {
            $text .= "\n**⚠ Outside GTA:** {$outside}\n";
        }
        $text .= "\n## Job\n" . $md('Service', $service) . $md('For a', $r['audience'] === 'business' ? 'Business' : 'Home') . $md('Company', $r['company'])
            . $md('Size', $r['size']) . $md('How often', $r['often']) . $md('Getting in and out', $r['access']) . $md('What’s going', $r['what']);
        $text .= "\n## Places\n" . ($r['service'] === 'cleaning'
            ? $md('Where', $this->place('area'))
            : $md('From', $this->place('from')) . $md('To', $this->place('to')));
        $text .= "\n## When\n" . $md('When', $this->when());
        $text .= "\n## Contact\n" . $md('Name', $r['name']) . $md('Phone', self::phone($r['phone'])) . $md('Email', $r['email'])
            . $md('Prefers', self::CONTACT[$r['contact_pref'] ?? ''] ?? null);
        $notes = trim((string) ($r['notes'] ?? ''));
        $text .= "\n## Notes\n" . ($notes === '' ? "—\n" : implode("\n", array_map(static fn ($l) => '> ' . $l, preg_split('/\R/', $notes))) . "\n");

        return [
            'to' => [$address, 'ONAWAY quotes board'],
            'replyTo' => null,
            'subject' => $subject,
            'html' => '',
            'text' => $text,
        ];
    }

    /**
     * The Telegram alert (context doc §7), in Telegram's HTML with every value escaped, one idea per line so it
     * scans on a phone; warnings come first so they're never missed:
     *   ⚠️ Email failed: team email, follow up manually
     *   NEW REQUEST  ONA-2611-0042          (the ref is tap-to-copy)
     *   Moving · Mississauga → Oakville
     *   Next week · Home · 1–2 bedroom · Elevator
     *   Ada · (416) 555-0100 · prefers Text
     *   Quote by 4:15 PM today
     * @param string[] $failed the emails that didn't go out: 'team', 'customer'
     */
    public function telegram(array $failed = []): string
    {
        $r = $this->row;
        $e = [Telegram::class, 'e'];
        $join = static fn (array $parts) => implode(' · ', array_map($e, array_values(array_filter($parts, static fn ($v) => $v !== null && $v !== ''))));
        $lines = [];
        if ($failed) {
            $lines[] = '⚠️ <b>Email failed:</b> ' . implode(' and ', array_map(static fn ($f) => "{$f} email", $failed)) . ', follow up manually';
        }
        if ($outside = $this->outside()) {
            $lines[] = '⚠️ <b>Outside GTA:</b> ' . Telegram::e($outside);
        }
        $lines[] = '<b>NEW REQUEST</b>  <code>' . Telegram::e($this->ref) . '</code>';
        $lines[] = '<b>' . $join([self::SERVICE[$r['service']], $this->route()]) . '</b>';
        // the job at a glance: when, who it's for, then whatever the service asked (size, how often, access, load)
        $lines[] = $join([
            $this->whenShort() . ($r['flexible'] && $r['timing'] !== 'flexible' ? ' (flexible)' : ''),
            $r['audience'] === 'business' ? 'Business' . ($r['company'] ? ': ' . $r['company'] : '') : 'Home',
            $r['size'], $r['often'], $r['access'], $r['what'],
        ]);
        $first = Mailer::line(explode(' ', $r['name'])[0]);
        $lines[] = $join([
            mb_strtoupper(mb_substr($first, 0, 1)) . mb_substr($first, 1),
            self::phone($r['phone']), // Telegram makes the number tappable itself
            isset(self::CONTACT[$r['contact_pref'] ?? '']) ? 'prefers ' . self::CONTACT[$r['contact_pref']] : null,
        ]);
        $lines[] = 'Quote by <b>' . Telegram::e($this->promised) . '</b>';
        return implode("\n", $lines);
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

    // The customer's short form: "Wed, Nov 4" or "This week"
    private function whenShort(): string
    {
        $r = $this->row;
        return $r['timing'] === 'date'
            ? (new DateTimeImmutable($r['timing_date'], $this->tz))->format('D, M j')
            : (self::TIMING[$r['timing']] ?? $r['timing']);
    }

    private function promisedAt(): ?DateTimeImmutable
    {
        return empty($this->row['promised_by']) ? null : new DateTimeImmutable($this->row['promised_by'], new DateTimeZone('UTC'));
    }

    // "Due 4:15 PM EST", or "Due Tue 10:00 AM EST" when the promise falls on a later day
    private function due(): string
    {
        $at = $this->promisedAt();
        if (!$at) {
            return 'Due ' . $this->promised;
        }
        $at = $at->setTimezone($this->tz);
        $sameDay = $at->format('Y-m-d') === $this->now->setTimezone($this->tz)->format('Y-m-d');
        return 'Due ' . $at->format(($sameDay ? '' : 'D ') . 'g:i A T');
    }

    // "Mon, Nov 2, 4:15 PM EST"
    private function stamp(DateTimeImmutable $at): string
    {
        return $at->setTimezone($this->tz)->format('D, M j, g:i A T');
    }

    private static function filled(array $rows): array
    {
        return array_filter($rows, static fn ($v) => $v !== null && $v !== '');
    }

    private static function phone(string $digits): string
    {
        return sprintf('(%s) %s-%s', substr($digits, 0, 3), substr($digits, 3, 3), substr($digits, 6));
    }
}
