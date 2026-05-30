# Fitbit Analysis

Personal analytics app using the **[Google Health API](https://developers.google.com/health/about)** to surface granular health metrics (SpO₂, heart rate, sleep, and more) beyond the Google Health app’s daily summaries.

Optimized for **Fitbit Air** and other Fitbit devices synced through the **Google Health** app.

## Phase 0 — Get started

| Step | Action |
|------|--------|
| 1 | [Set up Google Cloud + OAuth](docs/GOOGLE-HEALTH-SETUP.md) |
| 2 | `cp .env.example .env` and set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| 3 | `npm install` → `npm run auth` → `npm run spike` |

### Commands

```bash
cd apps/fitbit-analysis
cp .env.example .env

npm install
npm run check-env   # Validates Google env vars
npm run auth        # Google OAuth — saves .google-health-tokens.json
npm run spike       # Probes Health API v4 → spike-output/
npm run typecheck

# Legacy Fitbit Web API (optional, deprecated)
npm run auth:legacy
npm run spike:legacy
```

## Documentation

- [VISION.md](./VISION.md) — Product vision and roadmap
- [docs/GOOGLE-HEALTH-SETUP.md](./docs/GOOGLE-HEALTH-SETUP.md) — **Primary** onboarding
- [docs/ENDPOINT-MIGRATION-MAP.md](./docs/ENDPOINT-MIGRATION-MAP.md) — Legacy vs v4 endpoints
- [docs/legacy/](./docs/legacy/) — Deprecated Fitbit Web API guides

## Status

**Phase 0** — Google Health API OAuth + spike tooling. Complete GCP setup and run `spike` with your synced device.
