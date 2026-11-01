<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;
use Throwable;

// After a request is saved: the team email, then the customer confirmation (Telegram and Trello join in
// steps 5–6). Each success stamps its column; a failure is logged, kept short in last_error, and never
// stops the next one. The visitor already has their answer by now.
final class Notifier
{
    public function __construct(
        private QuoteRepository $repo,
        private Mailer $mailer,
        private array $config,
        private DateTimeZone $tz,
    ) {
    }

    public function notify(int $id, string $ref, array $row, string $promised, DateTimeImmutable $now): void
    {
        $emails = new QuoteEmails(
            $row,
            $ref,
            $promised,
            $now,
            $this->tz,
            (string) ($this->config['company_phone'] ?: '+1 647 877 1411'),
            (string) ($this->config['smtp']['user'] ?? 'quotes@onaway.ca'),
        );
        $errors = [];
        foreach (['team_email' => ['emailed_team_at', 'team'], 'customer_email' => ['emailed_customer_at', 'customer']] as $name => [$column, $build]) {
            try {
                $this->mailer->send($emails->$build());
                $this->repo->stamp($id, $column, new DateTimeImmutable('now', new DateTimeZone('UTC')));
            } catch (Throwable $e) {
                Log::error($e, ['ref' => $ref, 'step' => $name]);
                $errors[] = $name . ': ' . self::reason($e);
            }
        }
        try {
            $this->mailer->close();
        } catch (Throwable) {
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
