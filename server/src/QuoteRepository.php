<?php
declare(strict_types=1);

namespace Onaway;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

// The quotes table. Columns are written only from this list, so no input ever names a column.
final class QuoteRepository
{
    private const COLUMNS = [
        'promised_by', 'privacy_version',
        'audience', 'company', 'service', 'size', 'often', 'access', 'what',
        'area_name', 'area_region', 'area_code', 'area_outside',
        'from_name', 'from_region', 'from_code', 'from_outside',
        'to_name', 'to_region', 'to_code', 'to_outside',
        'timing', 'timing_date', 'flexible',
        'notes', 'name', 'phone', 'email', 'contact_pref',
        'ip', 'user_agent',
    ];

    public function __construct(private Db $db)
    {
    }

    // The columns the notifications stamp when they succeed
    private const STAMPS = ['emailed_team_at', 'emailed_customer_at', 'telegram_at', 'trello_at'];

    /**
     * Saves a request and issues its reference in one transaction.
     * @return array{id: int, ref: string}
     */
    public function create(array $row, DateTimeImmutable $now, DateTimeZone $tz): array
    {
        $unknown = array_diff(array_keys($row), self::COLUMNS);
        if ($unknown) {
            throw new InvalidArgumentException('Unknown quote columns: ' . implode(', ', $unknown));
        }
        $row['created_at'] = $now->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $row = array_map(static fn ($v) => is_bool($v) ? (int) $v : $v, $row);

        return $this->db->transaction(static function (Db $db) use ($row, $now, $tz): array {
            $columns = array_keys($row);
            $db->run(
                sprintf(
                    'INSERT INTO quotes (%s) VALUES (%s)',
                    implode(', ', $columns),
                    implode(', ', array_map(static fn ($c) => ":$c", $columns))
                ),
                $row
            );
            $id = $db->lastId();
            $ref = Reference::make($id, $now, $tz);
            $db->run('UPDATE quotes SET ref = :ref WHERE id = :id', ['ref' => $ref, 'id' => $id]);
            return ['id' => $id, 'ref' => $ref];
        });
    }

    public function stamp(int $id, string $column, DateTimeImmutable $at): void
    {
        if (!in_array($column, self::STAMPS, true)) {
            throw new InvalidArgumentException("Not a stamp column: $column");
        }
        $this->db->run("UPDATE quotes SET $column = :at WHERE id = :id", [
            'at' => $at->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
            'id' => $id,
        ]);
    }

    // A short reason per failed step, e.g. "customer_email: SMTP Error: Could not authenticate."
    public function recordError(int $id, string $reason): void
    {
        $this->db->run('UPDATE quotes SET last_error = :e WHERE id = :id', ['e' => $reason, 'id' => $id]);
    }
}
