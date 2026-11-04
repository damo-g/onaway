# ONAWAY: Quote Backend Build Context

The brief for making the **Get a free quote** form (`quote.html`) actually work. Attach this to every step prompt. Where this doc and a step prompt disagree, the step prompt wins for that step; otherwise this doc wins.

---

## 1. What we're building

At the moment the quote form looks finished but sends nothing. We're adding a small, plain PHP backend on the existing cPanel hosting, so a request is:

1. checked for spam and validated,
2. **saved** to a MySQL database and given a **reference number**,
3. **emailed** in full to quotes@onaway.ca,
4. **confirmed** to the customer by email,
5. **pushed** to the team's phones through a Telegram bot,
6. **added as a card** to a Trello board for tracking,

and the page then shows the real reference and the "in writing by" time on the ticket.

**Kept deliberately simple:** no frameworks, no paid services, no Cloudflare hosting. PHPMailer is the only library (from step 3).

---

## 2. Hosting facts (fixed)

| | |
|---|---|
| cPanel account home | `/home/adeonvqg/` |
| onaway.ca document root | `/home/adeonvqg/onaway.ca/`, created by cPanel when onaway.ca was added as its own domain |
| `public_html/` | Belongs to **adeona.ca**, a different site. **Never write to it.** |
| Web server | LiteSpeed (honours `.htaccess`) |
| Available | PHP, MySQL/MariaDB, phpMyAdmin, cPanel email |
| Front-end deploy | GitHub Actions → FTP-Deploy → `onaway.ca/` (state file `.ftp-deploy-sync-state.json` lives there) |
| Existing files in `onaway.ca/` | The Vite build (`index.html`, `quote.html`, `about.html` …, `assets/`, `fonts/`, `images/`, `svg/`) plus an existing `.htaccess` |
| Mailbox | **quotes@onaway.ca** (create in cPanel if not done) |

---

## 3. Architecture: the dining room and the kitchen

| Part | Where on the server | In the repo | Public? |
|---|---|---|---|
| **Dining room**: the site | `/home/adeonvqg/onaway.ca/` | the Vite build | Yes |
| **Serving hatch**: one thin endpoint | `/home/adeonvqg/onaway.ca/api/quote.php` | `public/api/quote.php` (Vite copies `public/` into the build) | Yes, but holds no secrets and no logic |
| **Kitchen**: the real PHP code | `/home/adeonvqg/onaway-app/` | `server/` | **No**, outside every document root |
| **Safe**: passwords and keys | `/home/adeonvqg/onaway-app/config.php` | never committed (`config.sample.php` is) | No |
| **Order book**: every request | MySQL table `quotes` | `server/sql/*.sql` | No |

Server layout once built:

```
/home/adeonvqg/
  onaway.ca/                 ← site (deployed by the existing workflow)
    api/quote.php            ← the hatch
    api/.htaccess
  onaway-app/                ← kitchen (deployed by a second workflow job)
    bootstrap.php
    config.php               ← created by hand on the server, never deployed or deleted by CI
    src/ …
    sql/ …
    logs/                    ← error log, denied to the web
    vendor/                  ← PHPMailer, from step 3
  public_html/               ← adeona.ca, untouched
```

**Fallback** if a folder outside `onaway.ca/` can't be deployed to: `onaway.ca/_app/` with an `.htaccess` of `Require all denied`.

---

## 4. Request flow (end state)

1. The visitor presses **Send my request** and the page posts JSON to `/api/quote.php` in the background (no page reload).
2. **Spam checks:** honeypot, time trap, Turnstile, rate limit. A failed check gets a generic error.
3. **Validation** with the same rules and wording as the browser.
4. **Save** in a transaction, which issues the reference.
5. **Company email** to quotes@ (reply-to = customer).
6. **Customer confirmation** email.
7. **Telegram** alert to the team group.
8. **Trello** card, by emailing the board's private address.
9. The response is `{ ok, ref, promisedBy, promisedLabel }`, and the ticket stamps it.

Steps 5–8 each record a timestamp on the row when they succeed. If any of them fail, the visitor **still sees success** (the request is saved), `last_error` is set, and the Telegram alert carries a warning so someone follows up by hand.

---

## 5. What the form captures

`quote.html` is the source of truth for field names and option values. Read it before writing validation.

| Group | Fields |
|---|---|
| **Everyone** | audience (home / business), company (business only), service (cleaning / moving / delivery), when (this week / next week / a picked date / flexible), notes (optional, behind "+ Add a note"), name, phone, email, **contact preference (new, optional): Call · Text · Email** |
| **Places** | Cleaning: one place. Moving and Delivery: From → To. Each place stores the typed postcode or town, the tagged area (City of Toronto, Peel, York, Halton, Durham) and an outside-GTA flag (still sendable). No street address. |
| **Cleaning** | size, how often |
| **Moving** | size, getting in and out (required) |
| **Delivery** | what it is, same day or scheduled |
| **Sizes** | Home: Studio / 1–2 bedroom / 3+ bedroom / House. Business: Under 2,000 / 2,000–10,000 sq ft / Larger |
| **Added by the server** | ref, created_at, promised_by, status, privacy_version, ip, user_agent, delivery timestamps, last_error |

**Locked error wording**
- Missing: "We need this to prepare your quote."
- Bad email: "That email doesn't look right."
- Bad phone: "Please enter a 10-digit number."

---

## 6. Rules

**Reference:** `ONA-YYMM-NNNN`, where YYMM is the Toronto year and month at submission and NNNN is the row id zero-padded to 4 (5+ as it grows). It never resets, so it's unique by construction. Example: `ONA-2610-0042`. It appears in both email subjects, on the ticket stub, on the Trello card and later on the invoice.

**"In writing by" promise** (Toronto time; must match the front end exactly):
- 8:00 AM–6:00 PM: now + 2 hours.
- Before 8 AM: 10:00 AM today.
- After 6 PM: 10:00 AM tomorrow.
- Stored in UTC. The label reads "4:15 PM today" or "10 AM tomorrow".

**Hours:** every day, 8 AM–8 PM. After 6 PM an after-hours note shows under the lead (already in the front end).

**Statuses** (used on the Trello board; the database default is `new`): New → Quoted → Booked → Invoiced → Done, or Lost.

---

## 7. Messages

**Company email** (to quotes@onaway.ca, reply-to the customer)
- Subject: `New quote request [ONA-2610-0042] · Moving · Mississauga → Oakville`
- Body: every captured field, grouped as in §5, plus the promised time and any outside-GTA flag.

**Customer confirmation** (from quotes@onaway.ca)
- Subject: `We've got your request [ONA-2610-0042]`
- Body: "Got it, [Name]. Your request [ONA-2610-0042] is in. You'll have your quote in writing by [4:15 PM today]. Rather talk? Call [phone]." Nothing else: no marketing.

**Telegram alert** (bot → team group, both admins)
- `New request ONA-2610-0042 · Moving · Mississauga → Oakville · Next week · Ada · (416) 555-0000 · prefers Text · quote by 4:15 PM`
- With a warning line when any email failed.

**Trello card** (emailed to the board's private address)
- Title: `ONA-2610-0042 · Moving · Mississauga → Oakville · Ada`
- Description: the full request.
- Lists: New, Quoted, Booked, Invoiced, Done, Lost.

**Email deliverability:** send through PHPMailer with SMTP login to the quotes@ mailbox (not `mail()`). SPF and DKIM switched on in cPanel → Email Deliverability.

---

## 8. Spam protection (no Cloudflare hosting needed)

1. **Honeypot:** a hidden field; if it's filled, discard the request silently.
2. **Time trap:** reject anything sent within 3 seconds of the page loading.
3. **Cloudflare Turnstile:** a free, standalone widget, usually invisible. PHP verifies the token with Cloudflare.
4. **Rate limit:** at most 5 requests per IP per hour, counted from the `quotes` table.

---

## 9. Privacy and CASL

- **No marketing**, so there's no consent checkbox. Replying to a quote request is covered by implied consent.
- A line under Send: "We'll only use your details to reply to this request. Privacy →"
- `privacy_version` stores which version of that line was shown.
- The **Privacy page** (`privacy.html`) is built in step 7 from the approved draft and linked from the footer and the line under Send.

---

## 10. Failure handling

- **Network or server failure:** the form keeps every answer and shows "That didn't go through. Your details are still here. Try again, or call [phone]." The phone is a `tel:` link.
- **Saved but a notification failed:** the visitor sees success; the failure goes in `last_error` and the Telegram warning.
- **Errors never reach the browser.** Real errors go to `onaway-app/logs/`.

---

## 11. Secrets

**`config.php`** (on the server only; the sample is committed with empty values)
- DB host, name, user, password
- timezone (`America/Toronto`)
- SMTP host, port, user (quotes@onaway.ca), password (step 3)
- company phone for messages
- Turnstile site key and secret (step 4)
- Telegram bot token and group chat id (step 5)
- Trello board email address (step 6)

**GitHub repo secrets:** the existing site FTP login, plus `APP_FTP_SERVER`, `APP_FTP_USERNAME`, `APP_FTP_PASSWORD` for the kitchen deploy.

---

## 12. Who does what

| You (cPanel, browser) | Claude Code (repo) |
|---|---|
| Create the database and user | Write all PHP, SQL and the sample config |
| Run SQL files in phpMyAdmin | Update the GitHub Actions workflow |
| Check PHP version ≥ 8.1 with `pdo_mysql` | Adjust `.htaccess` so `/api/` isn't rewritten |
| Create `onaway-app/` and fill in `config.php` | Wire the front end |
| Create the FTP account for `onaway-app/` and add the GitHub secrets | Give the curl tests and the manual checklist for each step |
| Create quotes@, switch on SPF and DKIM | |
| Create the Turnstile widget, Telegram bot and group, Trello board | |
| Run the tests and report back | |

---

## 13. The build, step by step

Each step is one prompt, tested and working before the next starts.

| # | Step | Done when |
|---|---|---|
| 1 | **Database and reference numbers:** `quotes` table, kitchen folder and config, the hatch endpoint, kitchen deploy job | A curl POST returns `ONA-YYMM-NNNN` and the promised time, and the row is in phpMyAdmin |
| 2 | **Wire the form:** background submit, validation in both places with the locked wording, the contact-preference chips, the privacy line, real success and the failure state | A real request from the site stamps the ticket with the real ref |
| 3 | **Emails:** PHPMailer through quotes@, company email and customer confirmation, SPF and DKIM | Both emails arrive, not in spam |
| 4 | **Spam protection:** Turnstile, honeypot, time trap, rate limit | Bot-style requests are rejected; real ones pass |
| 5 | **Telegram alerts:** bot, group, alert per request, failure warning | Both phones buzz within seconds |
| 6 | **Trello board:** email-to-board, lists, card format | Each request appears as a card in New |
| 7 | **Privacy page** from the approved draft, linked from the footer and the form | Page live and linked |
| 8 | **End-to-end test:** each service, home and business, outside the GTA, before 8 AM and after 6 PM, spam attempts, a forced email failure, mobile | Every case behaves as this doc says |

---

## 14. Still to confirm

- The real company phone number (the site still uses a placeholder).
- Data retention: confirmed 6 months for requests that don't book, 7 years for booked jobs and invoices (on the Privacy page).
- Where the host stores data: confirmed United States (Namecheap, 198.54.116.104, on the Privacy page).