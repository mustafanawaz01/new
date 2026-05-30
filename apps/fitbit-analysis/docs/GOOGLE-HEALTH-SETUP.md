# Google Health API — setup (primary)

Fitbit Analysis uses the **[Google Health API](https://developers.google.com/health/about)** (`health.googleapis.com/v4`) with **Google OAuth 2.0**. This replaces the legacy Fitbit Web API (sunset ~September 2026).

**Works with:** Fitbit Air, other Fitbit devices, Pixel Watch — data synced via the **Google Health** app.

Estimated time: **20–30 minutes** (first time).

---

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `fitbit-analysis-dev`) or select an existing one.
3. Enable the **Google Health API** for this project:
   - APIs & Services → **Library** → search **Google Health API** → **Enable**.

---

## 2. OAuth consent screen

1. APIs & Services → **OAuth consent screen**.
2. User type: **External** (unless you use Workspace-only).
3. Fill required app information (name, support email, developer contact).
4. Under **Test users**, add **your Google account** email (the one linked to Fitbit / Google Health).
5. Save.

Unverified apps are limited to **100 test users** — sufficient for personal use. Public launch requires [app verification](https://developers.google.com/health/app-verification).

---

## 3. OAuth 2.0 credentials

1. APIs & Services → **Credentials** → **Create credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs:** `http://127.0.0.1:3030/callback` (must match `.env` exactly).
4. Create and copy **Client ID** and **Client secret**.

---

## 4. Scopes (Data Access)

1. OAuth consent screen → **Data Access** (or **Edit app** → Scopes).
2. **Add or remove scopes** → filter **Google Health API**.
3. Add at minimum:
   - `https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly`
   - `https://www.googleapis.com/auth/googlehealth.sleep.readonly`
4. Save.

Request only scopes you need. See [app verification](https://developers.google.com/health/app-verification) before going public.

---

## 5. Configure this project

```bash
cd apps/fitbit-analysis
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3030/callback
```

Install and authorize:

```bash
npm install
npm run check-env
npm run auth
npm run spike
```

- Tokens: `.google-health-tokens.json` (gitignored)
- Spike output: `spike-output/report.json`

---

## 6. Device checklist (Fitbit Air)

- [ ] Fitbit Air paired in **Google Health** app (not legacy Fitbit-only setup).
- [ ] Recent sync (open Google Health, pull to refresh if available).
- [ ] SpO₂ enabled in device/region (often sleep-focused on Air).

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| `access_denied` / not a test user | Add your Google email under OAuth consent → **Test users**. |
| `redirect_uri_mismatch` | Redirect URI in Cloud Console must match `GOOGLE_REDIRECT_URI` exactly (`127.0.0.1` vs `localhost`). |
| 403 on Health API | Confirm Google Health API enabled; scopes added on Data Access page. |
| Empty SpO₂ list | Check Google Health app for that day; try `daily_oxygen_saturation` in spike output; regional/device limits apply. |
| `invalid_grant` on refresh | Run `npm run auth` again (re-consent). |

---

## References

- [Set up Google Cloud and OAuth](https://developers.google.com/health/setup)
- [Endpoints guide](https://developers.google.com/health/endpoints)
- [Migration from Fitbit Web API](https://developers.google.com/health/migration)
- [Parity tool](https://developers.google.com/health/migration/parity-tool)

Legacy Fitbit Web API setup: [docs/legacy/PHASE-0-DEVELOPER-REGISTRATION.md](./legacy/PHASE-0-DEVELOPER-REGISTRATION.md) (`npm run auth:legacy`).
