import { GOOGLE_HEALTH_API_BASE } from "../../config.js";
import type { ListDataPointsResponse } from "./types.js";

export interface HealthApiCallResult {
  name: string;
  url: string;
  status: number;
  ok: boolean;
  body: unknown;
  errorMessage?: string;
  sampleCount?: number;
}

export async function listAllDataPoints(
  accessToken: string,
  dataTypePath: string,
  filter?: string,
  pageSize = 100,
): Promise<HealthApiCallResult> {
  const basePath = `${GOOGLE_HEALTH_API_BASE}/users/me/dataTypes/${dataTypePath}/dataPoints`;
  const allPoints: unknown[] = [];
  let pageToken: string | undefined;
  let lastUrl = basePath;
  let lastStatus = 200;

  do {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    params.set("pageSize", String(pageSize));
    if (pageToken) params.set("pageToken", pageToken);

    lastUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    const response = await fetch(lastUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    lastStatus = response.status;
    const text = await response.text();

    if (!response.ok) {
      let body: unknown = text;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        /* keep raw */
      }
      return {
        name: dataTypePath,
        url: lastUrl,
        status: lastStatus,
        ok: false,
        body,
        errorMessage: text.slice(0, 500),
      };
    }

    const page = JSON.parse(text) as ListDataPointsResponse;
    if (page.dataPoints?.length) {
      allPoints.push(...page.dataPoints);
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return {
    name: dataTypePath,
    url: lastUrl,
    status: lastStatus,
    ok: true,
    body: { dataPoints: allPoints },
    sampleCount: allPoints.length,
  };
}

export async function healthGet(
  accessToken: string,
  path: string,
  name: string,
): Promise<HealthApiCallResult> {
  const url = `${GOOGLE_HEALTH_API_BASE}${path}`;
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

  return {
    name,
    url,
    status: response.status,
    ok: response.ok,
    body,
    errorMessage: response.ok ? undefined : text.slice(0, 500),
  };
}
