<?php
// ONAWAY kitchen · settings and secrets.
// Copy to config.php on the server (/home/adeonvqg/onaway-app/config.php) and fill it in there.
// config.php is git-ignored and the deploy never uploads or deletes it.
return [
    // Step 1 · the database (cPanel → MySQL Databases; cPanel prefixes the names, e.g. adeonvqg_onaway)
    'db' => [
        'host' => 'localhost',
        'name' => '',
        'user' => '',
        'pass' => '',
    ],

    // Toronto: the reference's YYMM and the "in writing by" time
    'timezone' => 'America/Toronto',

    // Step 3 · email, sent with an SMTP login to the quotes@ mailbox
    'smtp' => [
        'host' => '',
        'port' => '',
        'user' => '',      // quotes@onaway.ca
        'pass' => '',
    ],

    // The phone number written in messages ("Rather talk? Call …")
    'company_phone' => '',

    // Step 4 · Cloudflare Turnstile
    'turnstile' => [
        'site_key' => '',
        'secret' => '',
    ],

    // Step 5 · Telegram alerts to the team group
    'telegram' => [
        'bot_token' => '',
        'chat_id' => '',
    ],

    // Step 6 · Trello, through the board's private email address
    'trello' => [
        'board_email' => '',
    ],
];
