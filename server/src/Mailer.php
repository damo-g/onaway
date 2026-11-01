<?php
declare(strict_types=1);

namespace Onaway;

use PHPMailer\PHPMailer\PHPMailer;
use RuntimeException;

// Sends over SMTP as the quotes@ mailbox (config.php → smtp). One connection is kept open for the
// emails of a request; 10 s timeout. A failed send throws (PHPMailer\PHPMailer\Exception).
class Mailer
{
    private ?PHPMailer $mail = null;

    public function __construct(private array $smtp)
    {
    }

    /**
     * @param array{to: array{string, string}, replyTo?: ?array{string, string}, subject: string, html: string, text: string} $message
     */
    public function send(array $message): void
    {
        $mail = $this->mail ??= $this->open();
        $mail->clearAddresses();
        $mail->clearReplyTos();
        $mail->addAddress($message['to'][0], self::line($message['to'][1]));
        if (!empty($message['replyTo'])) {
            $mail->addReplyTo($message['replyTo'][0], self::line($message['replyTo'][1]));
        }
        $mail->Subject = self::line($message['subject']);
        $mail->isHTML(true);
        $mail->Body = $message['html'];
        $mail->AltBody = $message['text'];
        $mail->send();
    }

    public function close(): void
    {
        $this->mail?->smtpClose();
    }

    // Anything typed by the visitor that reaches a header goes through here: no line breaks
    public static function line(string $value): string
    {
        return trim((string) preg_replace('/[\r\n\t\0]+/', ' ', $value));
    }

    private function open(): PHPMailer
    {
        $s = $this->smtp;
        if (empty($s['host']) || empty($s['user']) || empty($s['pass'])) {
            throw new RuntimeException('SMTP is not configured in config.php');
        }
        $port = (int) ($s['port'] ?: 465);
        $encryption = strtolower((string) ($s['encryption'] ?? '')) ?: ($port === 465 ? 'ssl' : 'tls');

        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $s['host'];
        $mail->Port = $port;
        $mail->SMTPAuth = true;
        $mail->Username = $s['user'];
        $mail->Password = $s['pass'];
        $mail->SMTPSecure = $encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->SMTPAutoTLS = $encryption !== 'ssl';
        $mail->Timeout = 10;
        $mail->SMTPKeepAlive = true;
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->Encoding = PHPMailer::ENCODING_QUOTED_PRINTABLE;
        $mail->Hostname = substr(strrchr($s['user'], '@') ?: '@onaway.ca', 1);
        $mail->XMailer = ' ';
        $mail->setFrom($s['user'], 'ONAWAY');
        return $mail;
    }
}
