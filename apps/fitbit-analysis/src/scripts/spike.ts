import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig, paths } from "../config.js";
import { buildSpikeEndpoints, fitbitGet, resolveSpikeDate } from "../lib/fitbit-api.js";
import { refreshAccessToken } from "../lib/fitbit-oauth.js";
import { readTokens, writeTokens } from "../lib/token-store.js";

interface SpikeReport {
  runAt: string;
  date: string;
  userId: string;
  scopes: string;
  results: {
    name: string;
    url: string;
    status: number;
    ok: boolean;
    errorMessage?: string;
    sampleCount?: number;
  }[];
  recommendations: string[];
}

function countSamples(name: string, body: unknown): number | undefined {
  if (typeof body !== "object" || body === null) return undefined;

  if (name === "spo2_intraday" && "spo2" in body && Array.isArray((body as { spo2: unknown }).spo2)) {
    return (body as { spo2: unknown[] }).spo2.length;
  }

  const heart = body as {
    "activities-heart-intraday"?: { dataset?: unknown[] };
  };
  const dataset = heart["activities-heart-intraday"]?.dataset;
  if (Array.isArray(dataset)) return dataset.length;

  if ("sleep" in body && Array.isArray((body as { sleep: unknown }).sleep)) {
    return (body as { sleep: unknown[] }).sleep.length;
  }

  return undefined;
}

async function getValidAccessToken(): Promise<{ accessToken: string; userId: string; scopes: string }> {
  const config = loadConfig();
  const stored = await readTokens(paths.tokenFile);
  if (!stored) {
    throw new Error(
      "No tokens found. Run `npm run auth` after registering your app (see docs/PHASE-0-DEVELOPER-REGISTRATION.md).",
    );
  }

  const obtained = new Date(stored.obtained_at).getTime();
  const expiresMs = stored.expires_in * 1000;
  const bufferMs = 5 * 60 * 1000;
  const isExpired = Date.now() > obtained + expiresMs - bufferMs;

  if (!isExpired) {
    return {
      accessToken: stored.access_token,
      userId: stored.user_id,
      scopes: stored.scope,
    };
  }

  console.log("Access token expired or near expiry — refreshing…");
  const refreshed = await refreshAccessToken(config, stored.refresh_token);
  await writeTokens(paths.tokenFile, refreshed);
  return {
    accessToken: refreshed.access_token,
    userId: refreshed.user_id,
    scopes: refreshed.scope,
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const date = resolveSpikeDate(config.FITBIT_SPIKE_DATE);
  const { accessToken, userId, scopes } = await getValidAccessToken();

  await mkdir(paths.spikeOutputDir, { recursive: true });

  const endpoints = buildSpikeEndpoints(date);
  const results: SpikeReport["results"] = [];
  const recommendations: string[] = [];

  console.log(`\n=== Fitbit API spike for ${date} (user ${userId}) ===\n`);

  for (const endpoint of endpoints) {
    const result = await fitbitGet(accessToken, endpoint.path, endpoint.name);
    const sampleCount = countSamples(endpoint.name, result.body);

    results.push({
      name: endpoint.name,
      url: result.url,
      status: result.status,
      ok: result.ok,
      errorMessage: result.errorMessage,
      sampleCount,
    });

    const statusLabel = result.ok ? "OK" : "FAIL";
    const extra =
      sampleCount !== undefined ? ` (${sampleCount} samples/records)` : result.errorMessage ?? "";
    console.log(`${statusLabel} ${endpoint.name} [${result.status}]${extra ? ` — ${extra}` : ""}`);

    const outPath = join(paths.spikeOutputDir, `${endpoint.name}.json`);
    await writeFile(outPath, JSON.stringify(result.body, null, 2), "utf8");
  }

  const spo2Intraday = results.find((r) => r.name === "spo2_intraday");
  if (spo2Intraday && spo2Intraday.status === 403) {
    recommendations.push(
      "SpO₂ intraday returned 403 — file an intraday access request (docs/INTRADAY-ACCESS-REQUEST.md).",
    );
  }

  const spo2Summary = results.find((r) => r.name === "spo2_summary");
  if (spo2Summary?.ok && spo2Intraday && !spo2Intraday.ok) {
    recommendations.push(
      "Daily SpO₂ summary works but intraday does not — use summary until intraday is enabled.",
    );
  }

  if (!results.find((r) => r.name === "heart_rate_intraday_1min")?.ok) {
    recommendations.push("Heart rate intraday failed — confirm heartrate scope was granted during auth.");
  }

  const report: SpikeReport = {
    runAt: new Date().toISOString(),
    date,
    userId,
    scopes,
    results,
    recommendations,
  };

  const reportPath = join(paths.spikeOutputDir, "report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`\nRaw responses written to: ${paths.spikeOutputDir}`);
  console.log(`Summary report: ${reportPath}`);

  if (recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const r of recommendations) {
      console.log(`  • ${r}`);
    }
  } else {
    console.log("\nAll probed endpoints succeeded.");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
