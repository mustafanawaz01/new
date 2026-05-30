# Fitbit Analysis — Product Vision

**Last updated:** 2026-05-30  
**Status:** Draft — planning phase

---

## 1. Problem statement

The official Fitbit app (and related Google surfaces) optimizes for **daily summaries** and simple charts. That works for casual tracking but falls short when users want to:

- See **when** a metric changed during the day (e.g. SpO₂ dip at 2am vs stable afternoon readings).
- Compare **multiple signals** on one timeline (heart rate, SpO₂, sleep stages, temperature).
- Zoom, pan, and filter beyond what the stock UI allows.
- Export or analyze data for personal research, coaching, or clinical conversations (with appropriate disclaimers).

**Fitbit Analysis** exists to become the “microscope” on top of Fitbit’s data layer: same underlying device data, **deeper presentation and insight**.

---

## 2. Vision

> **Give Fitbit users full-fidelity access to their own health time series—visualized clearly, explored interactively, and explained in context—without replacing medical advice or Fitbit’s official apps.**

### What success looks like

| For users | For the product |
|-----------|-----------------|
| Minute- or second-level views where the API allows | Reliable sync from Fitbit with clear “last updated” state |
| Daily averages *and* intraday curves for SpO₂, HR, HRV, etc. | Multiple chart types (line, band, heatmap, sleep overlay) |
| Side-by-side days/weeks (“compare last Tuesday”) | Saved views and simple annotations |
| Optional CSV/JSON export of what they see | Transparent about API limits and missing data |

### What we are *not* building (initially)

- A replacement for Fitbit’s device pairing, firmware, or medical alerts.
- A multi-tenant SaaS for strangers’ data (start **personal use**; expand only with clear compliance work).
- Clinical diagnosis or treatment recommendations.

---

## 3. Data sources and platform reality

### Primary: Fitbit Web API (not “Google Fit” alone)

Fitbit is a Google company, but **detailed tracker data** for this product comes from the **Fitbit Web API** ([reference](https://dev.fitbit.com/build/reference/web-api/)), not from generic Google Fit aggregates.

Relevant API families include:

| Domain | Typical use in this app |
|--------|-------------------------|
| **SpO₂** (summary + intraday) | Blood oxygen — core motivator for the project |
| **Heart rate** (time series + intraday 1s/1min) | Correlation with SpO₂, activity, sleep |
| **HRV** (intraday, sleep-associated) | Recovery and stress patterns |
| **Sleep** | Stage timing overlaid on vitals |
| **Breathing rate** | Night trends vs SpO₂ |
| **Temperature** (core / skin) | Illness or environment patterns |
| **Activity / AZM** | Context for HR and SpO₂ changes |
| **Blood glucose** (if user logs / device supports) | Metabolic context |
| **ECG** (where device provides) | Event review, not real-time monitoring |
| **Body** (weight, body fat) | Longer-horizon trends |
| **Nutrition** | Optional context for glucose/weight |

**Intraday** endpoints are the technical backbone for “more detail than the app summary.” Access rules are stricter than daily summaries; see §6.

### Secondary / fallback: Fitbit data export

Fitbit allows users to **export account data** (CSV/ZIP). Some community reports suggest exports can contain **more complete SpO₂ intraday** than the API returns for the same period. The product should plan for:

- API-first live experience.
- Optional **import pipeline** for historical gaps or API denials.

### Future: Google Health / Health Connect

As Google evolves health APIs, evaluate whether **Health Connect** or successor APIs expose comparable intraday series. Until parity is proven, treat Fitbit Web API as source of truth for Fitbit hardware.

### Critical platform note: API sunset

Industry reporting indicates the **Fitbit Web API is scheduled to sunset around September 2026**, with OAuth tokens ceasing to work afterward. Any implementation plan must include:

1. A **migration track** (Health Connect, new Google health APIs, or export-only mode).
2. **Local persistence** of fetched data so users retain history if the API closes.
3. Monitoring official Google/Fitbit developer announcements.

---

## 4. User experience principles

1. **Time is the hero** — Every metric view anchors on a selectable date range with timezone-aware timestamps.
2. **Show gaps honestly** — Missing sync, denied intraday scope, or sleep-only SpO₂ should be explained in UI copy, not shown as zero.
3. **Progressive disclosure** — Default: readable day view; advanced: 1-second HR, raw tables, export.
4. **Compare and correlate** — Dual-axis and shared-x charts (e.g. SpO₂ + sleep stage + HR).
5. **Privacy by default** — Data stays in the user’s account/storage unless they explicitly export.

### Example views (MVP → later)

| View | Description |
|------|-------------|
| **SpO₂ day explorer** | Intraday curve + daily min/avg/max + sleep window shading |
| **Vitals dashboard** | HR, HRV, breathing rate, temp for selected day |
| **Sleep overlay** | Sleep stages with vitals aligned to hypnogram |
| **Week compare** | Small multiples or overlaid normalized days |
| **Trend gallery** | 7/30/90-day rolling stats for any metric |
| **Insight cards** (later) | Rule-based highlights: “Lowest SpO₂ during REM on 3 nights this week” |

---

## 5. Technical direction (recommended)

> Detailed architecture TBD when implementation starts. This section captures **intent** aligned with repo conventions (TypeScript, strict typing, production-grade, security-first).

### Suggested stack (flexible)

| Layer | Recommendation |
|-------|----------------|
| **Monorepo home** | `apps/fitbit-analysis` (this folder) |
| **Frontend** | React + TypeScript + Tailwind; charting via e.g. Visx, Recharts, or uPlot |
| **Backend** | Small Node/TypeScript API (or Next.js route handlers) for OAuth token exchange and Fitbit proxy |
| **Database** | SQLite or Postgres for cached time series and sync cursors |
| **Auth** | Fitbit OAuth 2.0 (PKCE for public client or confidential server app) |

### Core backend responsibilities

1. **OAuth** — Authorization code flow; store refresh tokens encrypted.
2. **Sync engine** — Incremental fetch per resource type; respect rate limits; webhook subscriptions where useful ([Subscription API](https://dev.fitbit.com/build/reference/web-api/subscription/)).
3. **Normalization** — Map Fitbit JSON to internal typed models (`Spo2Reading`, `HeartRateSample`, etc.).
4. **Aggregation layer** — Precompute rollups (hourly buckets) for fast UI while retaining raw intraday.

### Frontend responsibilities

1. Date/range picker and timezone display.
2. Interactive charts (zoom, brush, tooltips).
3. Scope and permission status (“Intraday SpO₂ not enabled for this app”).
4. Export current view.

---

## 6. Fitbit API constraints (must-read for implementation)

### OAuth scopes

Each metric requires explicit user consent scopes (e.g. `oxygen_saturation`, `heartrate`, `sleep`, `respiratory_rate`, `temperature`, `activity`, etc.). The app should request **only** scopes needed for enabled features.

### Intraday access is gated

Many intraday endpoints (including **SpO₂ intraday**) require:

- Application type **Personal** (for self-use) or appropriate partner tier.
- Correct scopes on the token.
- **Additional enablement** — Google has required developers to file an [intraday access request](https://issuetracker.google.com/issues/new?component=1677887&template=2088089) for some resources; community reports include **403 PERMISSION_DENIED** until manually approved.

Plan UX and engineering for **graceful degradation** to summary endpoints and export import.

### Rate limits and retention

- Honor Fitbit rate limits; backoff and queue sync jobs.
- Intraday heart rate is often limited to **24-hour windows** per request; design sync accordingly.
- Some SpO₂ intraday is **sleep-centric** (main sleep vs naps — behavior should be validated against docs and real payloads).

### Data quality

- API intraday SpO₂ may **not match** user CSV export row-for-row; document provenance in UI.
- Device model and firmware affect available sensors (SpO₂, ECG, temperature).

---

## 7. Privacy, security, and compliance

| Topic | Guidance |
|-------|----------|
| **Regulatory** | Health metrics may be **sensitive personal data** (GDPR) or **PHI** if used in clinical contexts. Initial build: **personal wellness tool**, not a HIPAA-covered product, unless explicitly scoped later. |
| **Policies** | Comply with [Fitbit Platform Terms](https://dev.fitbit.com/legal/platform-terms-of-service), [User Data and Developer Policy](https://dev.fitbit.com/legal/user-data-and-developer-policy), and OAuth consent requirements. |
| **Storage** | Encrypt tokens at rest; never log access tokens; rotate secrets via env vars. |
| **Minimization** | Cache only what the UI needs; support “delete all my data.” |
| **Disclaimers** | Prominent non-medical disclaimer; encourage professional care for concerns. |

---

## 8. Phased roadmap

### Phase 0 — Foundation (current)

- [x] Repo folder and vision (this document)
- [ ] Register Fitbit developer application (Personal)
- [ ] Request intraday enablement for required metrics
- [ ] Spike: authenticate and fetch one day of SpO₂ + HR intraday

### Phase 1 — MVP (“see more than the app”)

- OAuth login and token refresh
- Sync SpO₂ (summary + intraday where allowed) and heart rate intraday
- Single-day SpO₂ explorer chart with sleep window
- Local DB cache and manual refresh

### Phase 2 — Multi-metric dashboard

- Sleep, HRV, breathing rate, temperature
- Multi-series charts and week view
- CSV export of displayed series

### Phase 3 — Insight and resilience

- Comparison modes and simple rule-based insights
- Fitbit export import for backfill
- Webhook-driven sync
- Migration plan as Fitbit Web API sunsets

---

## 9. Open questions

1. **Deployment model** — Local-only desktop, self-hosted server, or hosted web app?
2. **Single user vs family** — Fitbit API can access authorized users; is multi-profile in scope?
3. **Mobile** — Responsive web first, or native wrapper later?
4. **Offline** — How much history to retain locally (disk, backup)?
5. **Post-2026 API** — Which Google health API will replace Fitbit Web API for intraday SpO₂?

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fitbit Web API sunset (~Sep 2026) | No live sync | Persist data; track Google replacements; export import |
| Intraday SpO₂ 403 / incomplete data | Core feature blocked | File intraday request; summary + export path; clear UX |
| API vs export mismatch | User distrust | Label data source; avoid false precision |
| Scope creep (medical device claims) | Legal/reputational | Wellness positioning; no diagnostic copy |
| Rate limits | Slow sync | Incremental sync, webhooks, caching |

---

## 11. References

- [Fitbit Web API Reference](https://dev.fitbit.com/build/reference/web-api/)
- [Authorization guide](https://dev.fitbit.com/build/reference/web-api/developer-guide/authorization/)
- [Intraday overview](https://dev.fitbit.com/build/reference/web-api/intraday/)
- [SpO₂ endpoints](https://dev.fitbit.com/build/reference/web-api/spo2/)
- [Community: SpO₂ intraday access issues](https://community.fitbit.com/t5/Web-API-Development/Permission-Denied-for-SpO2-Intraday-but-Heart-Rate-Intraday-Works-Personal/td-p/5792315)

---

*This document should evolve as spikes prove what data is actually available for your Fitbit account and app registration.*
