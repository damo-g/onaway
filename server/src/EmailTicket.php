<?php
declare(strict_types=1);

namespace Onaway;

// The pieces the quote emails are drawn with (EM-04, docs/mocks/email-tickets.html): tables and inline styles only,
// no SVG and no CSS masks. Images are the wordmark, the W and the perforation tiles, served from onaway.ca/email/.
// Locked: Stamp · subtle all round (3px bites every 10px, as TS-02); the round 3 W notch where a stub tears away.
final class EmailTicket
{
    public const PAPER = '#F7F2E7';
    public const FACE = '#EFE7D6';
    public const STUB = '#EAE1CF';
    public const CARBON = '#202521';
    public const YELLOW = '#E4BB3F';
    public const RUST = '#A9503E';
    public const MUTED = '#5D625C';
    public const RULE = '#C9C3B6';
    public const LIGHT_RULE = '#D9D3C7';
    public const UNLIT = '#E0D9CB';
    public const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    public const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

    private const R = 3;  // bite radius
    private const P = 10; // bite pitch
    private const N = 13; // notch radius

    // 5×7 dot-matrix glyphs for the reference (ONA-YYMM-NNNN)
    private const GLYPH = [
        'O' => ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], 'N' => ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
        'A' => ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], '-' => ['000', '000', '000', '111', '000', '000', '000'],
        '0' => ['01110', '10011', '10101', '10101', '11001', '10001', '01110'], '1' => ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
        '2' => ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], '3' => ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
        '4' => ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], '5' => ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
        '6' => ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7' => ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
        '8' => ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9' => ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    ];

    public function __construct(private string $assets)
    {
        $this->assets = rtrim($assets, '/') . '/';
    }

    public static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    // A time never breaks inside itself: "4:15 PM today" stays on one line
    public static function nb(string $html): string
    {
        return (string) preg_replace('/(\d{1,2}:\d{2} [AP]M(?: [A-Z]{3,4})?(?: today| tomorrow)?)/', '<span style="white-space:nowrap;">$1</span>', $html);
    }

    public static function table(string $inner, string $style = ''): string
    {
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;' . $style . '">' . $inner . '</table>';
    }

    public static function gap(int $h): string
    {
        return '<div style="height:' . $h . 'px;line-height:' . $h . 'px;font-size:0;">&nbsp;</div>';
    }

    public static function mono(int $size, string $color, string $extra = ''): string
    {
        return 'font-family:' . self::MONO . ';font-size:' . $size . 'px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;color:' . $color . ';' . $extra;
    }

    public static function sans(int $size, string $color, string $extra = ''): string
    {
        return 'font-family:' . self::SANS . ';font-size:' . $size . 'px;line-height:1.45;color:' . $color . ';' . $extra;
    }

    public static function square(): string
    {
        return '<span style="display:inline-block;width:8px;height:8px;margin-right:8px;background:' . self::YELLOW . ';vertical-align:1px;"></span>';
    }

    public static function preheader(string $text): string
    {
        return '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' . self::e($text) . '</div>';
    }

    public static function page(string $title, string $bg, string $inner, int $width): string
    {
        return '<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>' . self::e($title) . '</title></head>'
            . '<body style="margin:0;padding:0;background:' . $bg . ';">'
            . self::table('<tr><td align="center" style="padding:34px 16px;">' . self::table('<tr><td align="left">' . $inner . '</td></tr>', 'max-width:' . $width . 'px;') . '</td></tr>', 'background:' . $bg . ';')
            . '</body></html>';
    }

    public function img(string $file, int $w, int $h, string $alt = '', string $extra = ''): string
    {
        return '<img src="' . self::e($this->assets . $file) . '" width="' . $w . '" height="' . $h . '" alt="' . self::e($alt) . '" style="display:block;border:0;width:' . $w . 'px;height:' . ($alt === 'ONAWAY' ? 'auto' : $h . 'px') . ';' . $extra . '">';
    }

    /**
     * The ticket: sections stacked with a notched tear between them, Stamp · subtle round the outside.
     * Outlook desktop shows no background tiles, so its edge is straight and its notches square.
     * @param array<array{html: string, bg: string}> $sections
     */
    public function ticket(array $sections, string $pageBg, bool $seal = false): string
    {
        $suf = $pageBg === self::FACE ? '-face' : '';
        $tile = fn (string $side) => self::e($this->assets . "edge-subtle{$suf}-{$side}.png");
        $R = self::R;
        $P = self::P;
        $N = self::N;
        $side = fn (string $s, string $bg) => '<td width="' . $R . '" style="width:' . $R . 'px;background-color:' . $bg . ';background-image:url(\'' . $tile($s) . '\');background-repeat:repeat-y;background-size:' . $R . 'px ' . $P . 'px;font-size:0;">&nbsp;</td>';
        $edge = fn (string $s, string $bg) => '<tr><td colspan="3" height="' . $R . '" style="height:' . $R . 'px;font-size:0;line-height:0;background-color:' . $bg . ';background-image:url(\'' . $tile($s) . '\');background-repeat:repeat-x;background-size:' . $P . 'px ' . $R . 'px;">&nbsp;</td></tr>';
        // The W notch: each quarter's rounded corner faces the tear line, so the two lobes on each side mirror one
        // another. A collapsed table can't round a cell, so each quarter is a rounded block on the ticket's tint.
        $q = fn (string $bg, string $radius) => '<td width="' . $N . '" height="' . $N . '" style="width:' . $N . 'px;height:' . $N . 'px;padding:0;background:' . $bg . ';font-size:0;line-height:0;"><div style="width:' . $N . 'px;height:' . $N . 'px;background:' . $pageBg . ';border-radius:' . $radius . ';font-size:0;line-height:0;">&nbsp;</div></td>';
        $lineTop = fn (string $bg) => '<td style="background:' . $bg . ';border-bottom:1.5px dashed ' . self::RULE . ';font-size:0;">&nbsp;</td>';
        $lineBot = fn (string $bg) => '<td style="background:' . $bg . ';font-size:0;">&nbsp;</td>';
        $sealCell = '<td rowspan="2" width="42" style="width:42px;padding:0;font-size:0;line-height:0;">' . $this->img('w-tear.png', 42, 26) . '</td>';
        $seam = fn (string $up, string $down) => '<tr><td colspan="3" style="padding:0;">' . self::table(
            '<tr>' . $q($up, "0 0 {$N}px 0") . $lineTop($up) . ($seal ? $sealCell . $lineTop($up) : '') . $q($up, "0 0 0 {$N}px") . '</tr>'
            . '<tr>' . $q($down, "0 {$N}px 0 0") . $lineBot($down) . ($seal ? $lineBot($down) : '') . $q($down, "{$N}px 0 0 0") . '</tr>'
        ) . '</td></tr>';

        $rows = '';
        foreach ($sections as $i => $s) {
            if ($i > 0) {
                $rows .= $seam($sections[$i - 1]['bg'], $s['bg']);
            }
            $rows .= '<tr>' . $side('left', $s['bg']) . '<td style="background-color:' . $s['bg'] . ';">' . $s['html'] . '</td>' . $side('right', $s['bg']) . '</tr>';
        }
        return self::table($edge('top', $sections[0]['bg']) . $rows . $edge('bottom', $sections[count($sections) - 1]['bg']));
    }

    // One cell per dot, colour as an attribute, 1px gaps from cellspacing: square LEDs, about 25 KB, so the email
    // stays well under Gmail's 102 KB clip. Table cells, not an image, so it shows with images off.
    public static function matrix(string $text, string $on = self::CARBON, string $off = self::UNLIT): string
    {
        $td = static fn (string $c) => '<td width="3" height="3" bgcolor="' . $c . '" style="font-size:0;line-height:0"></td>';
        $blank = '<td width="3" style="font-size:0;line-height:0"></td>';
        $glyphs = array_map(static fn (string $c) => self::GLYPH[$c] ?? self::GLYPH['-'], str_split($text));
        $rows = '';
        for ($y = 0; $y < 7; $y++) {
            $cells = array_map(static fn (array $g) => implode('', array_map(static fn (string $b) => $td($b === '1' ? $on : $off), str_split($g[$y]))), $glyphs);
            $rows .= '<tr>' . implode($blank, $cells) . '</tr>';
        }
        return '<table role="presentation" cellpadding="0" cellspacing="1" border="0" aria-label="' . self::e($text) . '">' . $rows . '</table>';
    }

    // Decorative bars from the reference's characters (it doesn't scan)
    public static function barcode(string $text, string $align = 'right'): string
    {
        $bars = '';
        foreach (str_split(str_replace('-', '', $text)) as $ch) {
            $n = ord($ch);
            $bars .= '<td width="' . (($n % 3) + 1) . '" style="background:' . self::CARBON . ';"></td><td width="' . ((($n >> 2) % 2) + 1) . '"></td>'
                . '<td width="' . ((($n >> 1) % 2) + 2) . '" style="background:' . self::CARBON . ';"></td><td width="2"></td>';
        }
        return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="' . $align . '" style="border-collapse:collapse;height:34px;"><tr style="height:34px;">' . $bars . '</tr></table>';
    }
}
