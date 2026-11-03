<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;
use Throwable;

// After a request is saved: the team email, the customer confirmation, the Trello card (an email to the board),
// then the Telegram alert, which warns when any of those emails failed so someone follows up by hand. Each success
// stamps its column; a failure is logged, kept short in last_error, and never stops the next one. The visitor
// already has their answer.
final class Notifier
{
    public function __construct(
        private QuoteRepository $repo,
        private Mailer $mailer,
        private array $config,
        private DateTimeZone $tz,
        private ?GeoIp $geoIp = null,
        private ?Telegram $telegram = null,
    ) {
    }

    public function notify(int $id, string $ref, array $row, string $promised, DateTimeImmutable $now): void
    {
        // Where the request came from, for the team only (never sent to the customer)
        $visitor = [
            'device' => Device::describe($row['user_agent'] ?? null),
            'ip' => (string) ($row['ip'] ?? ''),
            'location' => ($this->geoIp ?? new GeoIp($this->config['geoip'] ?? []))->locate((string) ($row['ip'] ?? '')),
        ];
        $emails = new QuoteEmails(
            $row,
            $ref,
            $promised,
            $now,
            $this->tz,
            (string) ($this->config['company_phone'] ?: '+1 647 877 1411'),
            (string) ($this->config['smtp']['user'] ?? 'quotes@onaway.ca'),
            $visitor,
            // the emails' images ship with the site, in public/email/
            (string) ($this->config['email_assets'] ?? 'https://onaway.ca/email/'),
        );
        $errors = [];
        $failed = [];
        foreach (['team_email' => ['emailed_team_at', 'team'], 'customer_email' => ['emailed_customer_at', 'customer']] as $name => [$column, $build]) {
            try {
                $this->mailer->send($emails->$build());
                $this->repo->stamp($id, $column, new DateTimeImmutable('now', new DateTimeZone('UTC')));
            } catch (Throwable $e) {
                Log::error($e, ['ref' => $ref, 'step' => $name]);
                $errors[] = $name . ': ' . self::reason($e);
                $failed[] = $build;
            }
        }
        // The Trello card: off while the board address is empty
        $board = trim((string) ($this->config['trello']['board_email'] ?? ''));
        if ($board !== '') {
            try {
                $this->mailer->send($emails->board($board));
                $this->repo->stamp($id, 'trello_at', new DateTimeImmutable('now', new DateTimeZone('UTC')));
            } catch (Throwable $e) {
                Log::error($e, ['ref' => $ref, 'step' => 'board_email']);
                $errors[] = 'board_email: ' . self::reason($e);
                $failed[] = 'board';
            }
        }
        try {
            $this->mailer->close();
        } catch (Throwable) {
        }

        $telegram = $this->telegram ?? new Telegram($this->config['telegram'] ?? []);
        if ($telegram->enabled()) { // both values empty: Telegram is off
            try {
                $telegram->send($emails->telegram($failed));
                $this->repo->stamp($id, 'telegram_at', new DateTimeImmutable('now', new DateTimeZone('UTC')));
            } catch (Throwable $e) {
                Log::error($e, ['ref' => $ref, 'step' => 'telegram']);
                $errors[] = 'telegram: ' . self::reason($e);
            }
        }
        if ($errors) {
            $this->repo->recordError($id, implode('; ', $errors));
        }
    }

    // "SMTP Error: Could not authenticate." → kept short for the row
    private static function reason(Throwable $e): string
    {
        return mb_substr(Mailer::line($e->getMessage()), 0, 200);
    }
}
