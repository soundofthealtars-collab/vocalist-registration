# Sound of the Altar — The 120 Edition

Vocalist registration for the live recording, with a shared 120-place limit, rehearsal commitment, and an optional WhatsApp invitation after registration.

## Hosting setup

1. Use a PHP 8.1+ host with sessions, PDO MySQL, HTTPS, and a MySQL/InnoDB database. Set the web document root to `public/`; keep the other files outside the web root.
2. Import `schema.sql` once into an empty database using its administration panel. It creates the event with 120 places and a separate registration table.
3. Set the PHP runtime environment variables `DB_DSN` (for example `mysql:host=localhost;dbname=altar;charset=utf8mb4`), `DB_USER`, and `DB_PASSWORD`. Use a restricted database account with SELECT on both tables, INSERT on registrations, and any additional privileges your MySQL version requires for SELECT FOR UPDATE. Do not commit credentials.
4. Optionally set `WHATSAPP_INVITE` to the actual `https://chat.whatsapp.com/…` invite. Without it, successful registrations show a confirmation without a link.
5. Test with a staging database before inviting vocalists: submit once, refresh the confirmation, submit the same number again, and try two different numbers concurrently with only one place left. Verify the count never exceeds 120.

Kenyan mobile numbers starting 07 or 01 are normalized to +254. For other countries, enter the international number beginning with +. Names, numbers, vocal parts, optional ministry, and commitments are stored privately in MySQL. Restrict organizer access and set a retention period appropriate for the event.
