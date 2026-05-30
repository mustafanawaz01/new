import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadLegacyFitbitConfig, legacyPaths } from "../fitbit-config.js";
import { buildSpikeEndpoints, fitbitGet, resolveSpikeDate } from "../lib/fitbit-api.js";
import { refreshAccessToken } from "../lib/fitbit-oauth.js";
import { readFitbitTokens, writeFitbitTokens } from "../lib/token-store.js";

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
  const heart = body as { "activities-heart-intraday"?: { dataset?: unknown[] } };
  if (Array.isArray(heart["activities-heart-intraday"]?.dataset)) {
    return heart["activities-heart-intraday"].dataset.length;
  }
  if ("sleep" in body && Array.isArray((body as { sleep: unknown }).sleep)) {
    return (body as { sleep: unknown[] }).sleep.length;
  }
  return undefined;
}

async function getValidAccessToken(): Promise<{ accessToken: string; userId: string; scopes: string }> {
  const config = loadLegacyFitbitConfig();
  const stored = await readFitbitTokens(legacyPaths.tokenFile);
  if (!stored) {
    throw new Error("No legacy tokens. Run npm run auth:legacy");
  }

  const obtained = new Date(stored.obtained_at).getTime();
  const isExpired = Date.now() > obtained + stored.expires_in * 1000 - 5 * 60 * 1000;

  if (!isExpired) {
    return { accessToken: stored.access_token, userId: stored.user_id, scopes: stored.scope };
  }

  const refreshed = await refreshAccessToken(config, stored.refresh_token);
  await writeFitbitTokens(legacyPaths.tokenFile, refreshed);
  return { accessToken: refreshed.access_token, userId: refreshed.user_id, scopes: refreshed.scope };
}

async function main(): Promise<void> {
  const config = loadLegacyFitbitConfig();
  const date = resolveSpikeDate(config.FITBIT_SPIKE_DATE);
  const { accessToken, userId, scopes } = await getValidAccessToken();

  await mkdir(legacyPaths.spikeOutputDir, { recursive: true });

  const endpoints = buildSpikeEndpoints(date);
  const results: SpikeReport["results"] = [];

  console.log(`\n=== Legacy Fitbit API spike for ${date} (user ${userId}) ===\n`);

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
    console.log(`${result.ok ? "OK" : "FAIL"} ${endpoint.name} [${result.status}]`);
    await writeFile(
      join(legacyPaths.spikeOutputDir, `${endpoint.name}.json`),
      JSON.stringify(result.body, null, 2),
      "utf8",
    );
  }

  await writeFile(
    join(legacyPaths.spikeOutputDir, "report.json"),
    JSON.stringify({ runAt: new Date().toISOString(), date, userId, scopes, results }, null, 2),
    "utf8",
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
