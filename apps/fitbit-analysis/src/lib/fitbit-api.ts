import { FITBIT_API_BASE } from "../config.js";

export interface ApiCallResult {
  name: string;
  url: string;
  status: number;
  ok: boolean;
  body: unknown;
  errorMessage?: string;
}

export async function fitbitGet(
  accessToken: string,
  path: string,
  name: string,
): Promise<ApiCallResult> {
  const url = `${FITBIT_API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    body = { raw: text };
  }

  const errorMessage =
    !response.ok && typeof body === "object" && body !== null && "errors" in body
      ? JSON.stringify((body as { errors: unknown }).errors)
      : !response.ok
        ? text.slice(0, 500)
        : undefined;

  return {
    name,
    url,
    status: response.status,
    ok: response.ok,
    body,
    errorMessage,
  };
}

/** Resolve "today" to yyyy-MM-dd in local timezone. */
export function resolveSpikeDate(input: string): string {
  if (input !== "today") {
    return input;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildSpikeEndpoints(date: string): { name: string; path: string }[] {
  return [
    { name: "profile", path: "/1/user/-/profile.json" },
    { name: "spo2_summary", path: `/1/user/-/spo2/date/${date}.json` },
    { name: "spo2_intraday", path: `/1/user/-/spo2/date/${date}/all.json` },
    {
      name: "heart_rate_intraday_1min",
      path: `/1/user/-/activities/heart/date/${date}/1d/1min.json`,
    },
    { name: "sleep_log", path: `/1.2/user/-/sleep/date/${date}.json` },
    {
      name: "breathing_rate_summary",
      path: `/1/user/-/br/date/${date}.json`,
    },
  ];
}
