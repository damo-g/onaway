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

    // Step 3 · email, sent with an SMTP login to the quotes@ mailbox (cPanel → Email Accounts → Connect Devices).
    // Both emails come from this address; the team copy goes to it too.
    'smtp' => [
        'host' => '',        // onaway.ca
        'port' => 465,
        'encryption' => '',  // ssl (port 465) or tls (port 587); blank = from the port
        'user' => '',        // quotes@onaway.ca
        'pass' => '',
    ],

    // The phone number written in messages ("Rather talk? Call …")
    'company_phone' => '',

    // Optional: where the emails' images live (they ship with the site, in public/email/)
    'email_assets' => 'https://onaway.ca/email/',

    // Approximate place of the visitor's IP, team email only. Optional: leave as is for the free
    // keyless lookup; 'url' => '' turns it off; {ip} is replaced. 'token' is sent as a Bearer header.
    'geoip' => [
        'url' => 'https://free.freeipapi.com/api/v1/json/{ip}',
        'token' => '',
    ],

    // Step 4 · Cloudflare Turnstile
    'turnstile' => [
        'site_key' => '',
        'secret' => '',
    ],

    // Step 5 · Telegram alerts to the team group. Both empty = off.
    'telegram' => [
        'bot_token' => '',   // from @BotFather, like 1234567890:AA…
        'chat_id' => '',     // the group's id from getUpdates, a negative number like -1001234567890
    ],

    // Step 6 · Trello, through the board's private email address (Board menu → Email-to-board). Empty = off.
    'trello' => [
        'board_email' => '',   // like yourname+abc123xyz@boards.trello.com
    ],
];
