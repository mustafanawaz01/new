# Fitbit Analysis

Personal analytics app that uses the [Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/) to surface granular health metrics (SpO₂, heart rate, sleep, and more) beyond the official app’s daily summaries.

## Phase 0 — Get started

**Registration is manual** (your Fitbit/Google account). Follow the guide, then run the OAuth spike locally.

| Step | Action |
|------|--------|
| 1 | [Register your Fitbit developer app](docs/PHASE-0-DEVELOPER-REGISTRATION.md) at https://dev.fitbit.com/apps/new |
| 2 | Copy `.env.example` → `.env` and set `FITBIT_CLIENT_ID` |
| 3 | `npm install` → `npm run auth` → `npm run spike` |
| 4 | If SpO₂ intraday returns 403, [request intraday access](docs/INTRADAY-ACCESS-REQUEST.md) |

### Commands

```bash
cd apps/fitbit-analysis
cp .env.example .env
# Edit .env with Client ID from dev.fitbit.com

npm install
npm run check-env   # Validates .env and prints config
npm run auth        # Local OAuth (PKCE) — saves .fitbit-tokens.json
npm run spike       # Fetches sample endpoints → spike-output/
npm run typecheck
```

## Documentation

- [VISION.md](./VISION.md) — Product vision and roadmap
- [docs/PHASE-0-DEVELOPER-REGISTRATION.md](./docs/PHASE-0-DEVELOPER-REGISTRATION.md) — Developer app setup
- [docs/INTRADAY-ACCESS-REQUEST.md](./docs/INTRADAY-ACCESS-REQUEST.md) — Google intraday enablement template

## Status

**Phase 0** — OAuth + API spike tooling ready; awaiting your developer app registration and first successful `spike` run.
