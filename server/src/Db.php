<?php
declare(strict_types=1);

namespace Onaway;

use PDO;
use PDOStatement;
use Throwable;

// A thin PDO wrapper: prepared statements only, exceptions on error, UTC session.
final class Db
{
    public function __construct(private PDO $pdo)
    {
    }

    public static function connect(array $db): self
    {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $db['host'] ?: 'localhost', $db['name']);
        $pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $self = new self($pdo);
        $self->run("SET time_zone = '+00:00'");
        return $self;
    }

    public function run(string $sql, array $params = []): PDOStatement
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement;
    }

    public function lastId(): int
    {
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Runs $work inside a transaction: committed if it returns, rolled back if it throws.
     * @template T
     * @param callable(self): T $work
     * @return T
     */
    public function transaction(callable $work): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $work($this);
            $this->pdo->commit();
            return $result;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}
