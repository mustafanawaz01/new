# Phase 0 — Fitbit developer registration

**You must complete this in a browser with your own Fitbit/Google account.** This cannot be automated by an agent or CI: Fitbit binds the application to your developer identity and terms acceptance.

Estimated time: **10–15 minutes** (plus 1–7 days wait for optional intraday approval).

---

## Step 1 — Create a Fitbit developer account

1. Open **https://dev.fitbit.com/login** and sign in with the same Google/Fitbit account you use on your tracker (or create one).
2. Accept the **Fitbit Platform Terms of Service** and developer policies if prompted.

---

## Step 2 — Register the application

1. Go to **https://dev.fitbit.com/apps/new** (or **Manage My Apps** → **Register a New App**).
2. Use these recommended values (adjust name if you prefer):

| Field | Recommended value |
|-------|-------------------|
| **Application Name** | `Fitbit Analysis` (or your name) |
| **Description** | Personal app to visualize granular Fitbit health metrics (SpO₂, HR, sleep). |
| **Application Website** | Your repo URL or `http://localhost` for local-only use |
| **Organization** | Personal / your name |
| **Organization Website** | Same as above |
| **Terms of Service URL** | Same as above (required field; localhost is acceptable for personal apps) |
| **Privacy Policy URL** | Same as above |
| **OAuth 2.0 Application Type** | **Personal** |
| **Callback URL** | `http://127.0.0.1:3030/callback` |
| **Default Access Type** | **Read-Only** |

3. Submit the form.
4. On the app details page, copy:
   - **OAuth 2.0 Client ID**
   - **Client Secret** (Personal apps may still show one; the Phase 0 spike uses PKCE without sending the secret in the token exchange, per Fitbit’s Personal/Client app rules.)

---

## Step 3 — Configure this project

From `apps/fitbit-analysis/`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
FITBIT_CLIENT_ID=<paste Client ID>
FITBIT_REDIRECT_URI=http://127.0.0.1:3030/callback
```

Optional: set `FITBIT_CLIENT_SECRET` only if you later switch to a **Server** app type.

Install and authorize:

```bash
npm install
npm run auth
```

Open the printed URL if the browser does not open automatically. After consent, tokens are saved to `.fitbit-tokens.json` (gitignored).

Run the data spike:

```bash
npm run spike
```

Results are written to `spike-output/` for inspection.

---

## Step 4 — Request intraday access (SpO₂ and others)

Summary endpoints often work immediately; **intraday SpO₂** frequently returns `403` until Google enables it for your Client ID.

1. Follow **docs/INTRADAY-ACCESS-REQUEST.md** and submit the Google Issue Tracker form.
2. Keep using `npm run spike` — it records which endpoints succeed vs fail.

---

## Step 5 — Phase 0 checklist

- [ ] Developer account at https://dev.fitbit.com
- [ ] App registered as **Personal**, callback `http://127.0.0.1:3030/callback`
- [ ] `.env` filled with `FITBIT_CLIENT_ID`
- [ ] `npm run auth` completed (tokens in `.fitbit-tokens.json`)
- [ ] `npm run spike` run at least once
- [ ] Intraday access request filed (if SpO₂ intraday returns 403)

When all items are done, Phase 0 is complete and Phase 1 implementation can start.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| `redirect_uri_mismatch` | Callback in dev.fitbit.com must **exactly** match `FITBIT_REDIRECT_URI` (including `127.0.0.1` vs `localhost`). |
| `invalid_client` | Check Client ID; for Server apps, verify secret and Authorization header. |
| SpO₂ intraday `403` | Expected until intraday is enabled; use summary endpoint + file intraday request. |
| No SpO₂ data | Device must support SpO₂; readings are often sleep-related. Sync device first. |

Official references:

- [Authorization guide (PKCE)](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
- [Manage applications](https://dev.fitbit.com/apps)
