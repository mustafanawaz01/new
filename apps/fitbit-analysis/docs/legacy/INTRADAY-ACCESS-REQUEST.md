> **Deprecated.** See [GOOGLE-HEALTH-SETUP.md](../GOOGLE-HEALTH-SETUP.md). Legacy Fitbit Web API sunsets ~September 2026.

# Request Fitbit intraday API access

Google may require a manual enablement step for **intraday** resources (including **SpO₂ intraday**), even for **Personal** apps with the `oxygen_saturation` scope.

## When to file

Run `npm run spike` from `apps/fitbit-analysis/`. If you see:

```text
403 PERMISSION_DENIED
```

for `/spo2/date/.../all.json` while heart rate intraday works, file the request below.

## How to file

1. Open the intraday request form:  
   **https://issuetracker.google.com/issues/new?component=1677887&template=2088089**

2. Use this template (replace placeholders):

---

**Title:** Enable intraday API access for Client ID `<YOUR_CLIENT_ID>`

**Description:**

```
Application name: Fitbit Analysis
OAuth 2.0 Client ID: <YOUR_CLIENT_ID>
Application type: Personal
Purpose: Personal wellness dashboard to visualize granular SpO₂, heart rate,
HRV, breathing rate, and sleep-aligned metrics beyond daily summaries in
the official Fitbit app. Not for commercial distribution.

Endpoints needed (read-only):
- SpO₂ intraday: GET /1/user/-/spo2/date/{date}/all.json
- (Optional, if blocked) HRV intraday, breathing rate intraday

Scopes authorized by user: oxygen_saturation, heartrate, sleep,
respiratory_rate, profile

Current behavior:
- Heart rate intraday: <working | failing>
- SpO₂ intraday: 403 PERMISSION_DENIED
- SpO₂ daily summary: <working | failing>

Fitbit user ID from token response: <user_id from .fitbit-tokens.json>
```

---

3. Submit and watch email/Issue Tracker for updates. There is no guaranteed SLA; continue using summary endpoints and account export import (planned Phase 3) meanwhile.

## Community context

- [Permission Denied for SpO₂ Intraday (Personal)](https://community.fitbit.com/t5/Web-API-Development/Permission-Denied-for-SpO2-Intraday-but-Heart-Rate-Intraday-Works-Personal/td-p/5792315)
