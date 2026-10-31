-- ONAWAY · 001 · the order book: one row per quote request.
-- Run once in phpMyAdmin (select the database, SQL tab, paste, Go). MySQL 5.7+ / MariaDB 10.3+.
-- Times are UTC; the app turns them into Toronto time for the reference and the "in writing by" label.
-- Choice fields (size, often, access, what) hold the form's own wording, e.g. "1–2 bedroom".

CREATE TABLE IF NOT EXISTS quotes (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ref                 VARCHAR(20)  NULL COMMENT 'ONA-YYMM-NNNN, issued in the insert''s transaction',
  created_at          DATETIME     NOT NULL COMMENT 'UTC',
  promised_by         DATETIME     NOT NULL COMMENT 'UTC · the "in writing by" time',
  status              ENUM('new','quoted','booked','invoiced','done','lost') NOT NULL DEFAULT 'new',
  privacy_version     VARCHAR(20)  NOT NULL COMMENT 'which privacy line was shown under Send',

  -- The job
  audience            ENUM('home','business') NOT NULL,
  company             VARCHAR(120) NULL COMMENT 'business only, optional',
  service             ENUM('cleaning','moving','delivery') NOT NULL,
  size                VARCHAR(40)  NULL COMMENT 'cleaning, moving',
  often               VARCHAR(40)  NULL COMMENT 'cleaning',
  access              VARCHAR(40)  NULL COMMENT 'moving · getting in and out',
  what                VARCHAR(40)  NULL COMMENT 'delivery · what''s going',

  -- Where: cleaning uses area_*; moving and delivery use from_* and to_*. No street address.
  area_name           VARCHAR(80)  NULL COMMENT 'the typed town or postal code',
  area_region         VARCHAR(20)  NULL COMMENT 'Toronto, Peel, York, Halton or Durham',
  area_code           VARCHAR(8)   NULL,
  area_outside        TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = outside the GTA (still sendable)',
  from_name           VARCHAR(80)  NULL,
  from_region         VARCHAR(20)  NULL,
  from_code           VARCHAR(8)   NULL,
  from_outside        TINYINT(1)   NOT NULL DEFAULT 0,
  to_name             VARCHAR(80)  NULL,
  to_region           VARCHAR(20)  NULL,
  to_code             VARCHAR(8)   NULL,
  to_outside          TINYINT(1)   NOT NULL DEFAULT 0,

  -- When
  timing              VARCHAR(20)  NOT NULL COMMENT 'this-week, next-week, date (cleaning, moving) · same-day, date, regular (delivery)',
  timing_date         DATE         NULL COMMENT 'when timing = date',
  flexible            TINYINT(1)   NOT NULL DEFAULT 0,

  -- The person
  notes               TEXT         NULL,
  name                VARCHAR(100) NOT NULL,
  phone               VARCHAR(10)  NOT NULL COMMENT '10 digits',
  email               VARCHAR(254) NOT NULL,
  contact_pref        ENUM('call','text','email') NULL,

  -- Added by the server
  ip                  VARCHAR(45)  NOT NULL,
  user_agent          VARCHAR(255) NULL,
  emailed_team_at     DATETIME     NULL COMMENT 'UTC · company email sent (step 3)',
  emailed_customer_at DATETIME     NULL COMMENT 'UTC · customer confirmation sent (step 3)',
  telegram_at         DATETIME     NULL COMMENT 'UTC · team alert sent (step 5)',
  trello_at           DATETIME     NULL COMMENT 'UTC · card created (step 6)',
  last_error          TEXT         NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_ref (ref),
  KEY idx_created (created_at),
  KEY idx_status (status),
  KEY idx_ip (ip, created_at) COMMENT 'the rate limit: requests per IP per hour'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
