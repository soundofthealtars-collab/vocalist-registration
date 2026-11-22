# Sound of the Altar — The 120 Edition

Vocalist registration for the live recording, with a shared 120-place limit, rehearsal commitment, and an optional WhatsApp invitation after registration.

## Google Sheets and GitHub Pages setup

1. Use the existing [registration spreadsheet](https://docs.google.com/spreadsheets/d/1UIP3E1Yd4L77vEjNyKWYA2eR_bcdVLyYuqxEOU3YfC0/edit?gid=1740799887#gid=1740799887); do not import the template as a second database. The script targets spreadsheet ID `1UIP3E1Yd4L77vEjNyKWYA2eR_bcdVLyYuqxEOU3YfC0` and tab ID `1740799887` by default. Restrict sheet access to trusted organizers because identity document numbers and phone numbers are stored there.
2. In Google Apps Script, create a project from `apps-script/Code.gs`. Set script properties `SHEET_ID=1UIP3E1Yd4L77vEjNyKWYA2eR_bcdVLyYuqxEOU3YfC0`, `SHEET_GID=1740799887`, `CAPACITY=120`, and a long random `API_SECRET`. Confirm the target tab has the columns in `google-sheets-template.csv`.
3. Deploy the Apps Script as a Web app that executes as you and is accessible to anyone. The secret is required for every request; do not put it in the public site.
4. Deploy the Cloudflare Worker in this repository with Wrangler. Set the Worker secret values:

	```powershell
	npx wrangler secret put SHEETS_WEB_APP_URL
	npx wrangler secret put SHEETS_API_SECRET
	npx wrangler secret put WHATSAPP_INVITE
	npx wrangler deploy
	```

	Set `ALLOWED_ORIGINS` in `wrangler.toml` to the exact GitHub Pages origin, such as `https://your-name.github.io` (no path). For local testing, add `http://localhost` as a comma-separated origin.
5. In `public/index.html`, set the `registration-api` meta tag to your Worker endpoint, for example `https://vocalist-registration-api.your-account.workers.dev/api/register`.
6. Push the repository's `main` branch to GitHub and enable **Settings → Pages → Build and deployment → GitHub Actions**. The workflow publishes `public/` automatically.
7. Test availability, a valid registration, a duplicate registration, and the 120-place limit before sharing the form.

Kenyan mobile numbers starting 07 or 01 are normalized to +254. Other countries should enter an international number beginning with +. The Apps Script serializes registration writes and enforces the capacity limit and duplicate checks. The Cloudflare Worker validates submissions and keeps the Apps Script secret out of the browser.
