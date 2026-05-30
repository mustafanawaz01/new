# Fitbit Web API → Google Health API (v4)

Quick reference for migrating spike probes and future sync code.

| Legacy spike (`spike:legacy`) | Google Health v4 (`npm run spike`) |
|-------------------------------|-------------------------------------|
| `profile` | `identity` — `GET /v4/users/me/identity` |
| `spo2_summary` | `daily_oxygen_saturation` — `GET .../dataTypes/daily-oxygen-saturation/dataPoints` |
| `spo2_intraday` | `oxygen_saturation_intraday` — `GET .../dataTypes/oxygen-saturation/dataPoints` + filter |
| `heart_rate_intraday_1min` | `heart_rate` — `GET .../dataTypes/heart-rate/dataPoints` + filter |
| `sleep_log` | `sleep` — `GET .../dataTypes/sleep/dataPoints` + filter |
| `breathing_rate_summary` | `respiratory_rate` (optional) — daily or sample type per [reference](https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints) |

## Naming rules

| Context | Format | Example |
|---------|--------|---------|
| URL path (`dataTypes/{id}`) | kebab-case | `oxygen-saturation`, `heart-rate` |
| Filter query (`filter=`) | snake_case | `oxygen_saturation`, `heart_rate` |

## Aggregation (Phase 1+)

| Use case | Endpoint |
|----------|----------|
| Intraday buckets (e.g. 1-min HR) | `POST .../dataPoints:rollUp` |
| Daily rollups | `POST .../dataPoints:dailyRollUp` |
| Multi-source merged view | `GET .../dataPoints:reconcile` |

## Tools

- [Parity tool](https://developers.google.com/health/migration/parity-tool) — side-by-side legacy vs v4 responses
- [Migration overview](https://developers.google.com/health/migration)
