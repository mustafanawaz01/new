import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { OAuth2Client } from "google-auth-library";
import { loadGoogleConfig, paths } from "../config.js";
import { listAllDataPoints, healthGet } from "../lib/google-health/client.js";
import {
  DataTypeFilter,
  DataTypePath,
  filterIntervalCivilDay,
  filterSamplePhysicalDay,
  resolveSpikeDate,
} from "../lib/google-health/data-types.js";
import { applyTokensToClient, createOAuth2Client } from "../lib/google-health/oauth.js";
import type { DataPoint } from "../lib/google-health/types.js";
import { readGoogleTokens, writeGoogleTokens } from "../lib/token-store.js";

interface SpikeProbe {
  name: string;
  run: (accessToken: string) => Promise<{
    url: string;
    status: number;
    ok: boolean;
    body: unknown;
    errorMessage?: string;
    sampleCount?: number;
  }>;
}

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
    platforms?: string[];
    devices?: string[];
  }[];
  recommendations: string[];
}

function extractSources(body: unknown): { platforms: string[]; devices: string[] } {
  const platforms = new Set<string>();
  const devices = new Set<string>();
  if (typeof body !== "object" || body === null || !("dataPoints" in body)) {
    return { platforms: [], devices: [] };
  }
  const points = (body as { dataPoints: DataPoint[] }).dataPoints ?? [];
  for (const p of points) {
    if (p.dataSource?.platform) platforms.add(p.dataSource.platform);
    const name = p.dataSource?.device?.displayName;
    if (name) devices.add(name);
  }
  return { platforms: [...platforms], devices: [...devices] };
}

async function getAccessToken(config: ReturnType<typeof loadGoogleConfig>): Promise<{
  accessToken: string;
  userId: string;
  scopes: string;
}> {
  const stored = await readGoogleTokens(paths.tokenFile);
  if (!stored) {
    throw new Error("No tokens found. Run `npm run auth` (see docs/GOOGLE-HEALTH-SETUP.md).");
  }

  const client = createOAuth2Client(config);
  applyTokensToClient(client, stored);

  const isExpired = !stored.expiry_date || Date.now() >= stored.expiry_date - 5 * 60 * 1000;
  if (isExpired) {
    console.log("Refreshing access token…");
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error("Refresh failed — run npm run auth again");
    }
    const updated = await writeGoogleTokens(paths.tokenFile, {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token ?? stored.refresh_token,
      scope: credentials.scope ?? stored.scope,
      token_type: credentials.token_type ?? stored.token_type,
      expiry_date: credentials.expiry_date ?? Date.now() + 3600 * 1000,
      identity: stored.identity,
    });
    return {
      accessToken: updated.access_token,
      userId: updated.identity?.healthUserId ?? updated.identity?.legacyUserId ?? "me",
      scopes: updated.scope,
    };
  }

  return {
    accessToken: stored.access_token,
    userId: stored.identity?.healthUserId ?? stored.identity?.legacyUserId ?? "me",
    scopes: stored.scope,
  };
}

async function main(): Promise<void> {
  const config = loadGoogleConfig();
  const date = resolveSpikeDate(config.GOOGLE_SPIKE_DATE);
  const { accessToken, userId, scopes } = await getAccessToken(config);

  const probes: SpikeProbe[] = [
    {
      name: "identity",
      run: async (token) => {
        const r = await healthGet(token, "/users/me/identity", "identity");
        return { ...r, sampleCount: undefined };
      },
    },
    {
      name: "oxygen_saturation_intraday",
      run: async (token) => {
        const r = await listAllDataPoints(
          token,
          DataTypePath.oxygenSaturation,
          filterSamplePhysicalDay(DataTypeFilter.oxygenSaturation, date),
        );
        return { url: r.url, status: r.status, ok: r.ok, body: r.body, errorMessage: r.errorMessage, sampleCount: r.sampleCount };
      },
    },
    {
      name: "daily_oxygen_saturation",
      run: async (token) => {
        const r = await listAllDataPoints(
          token,
          DataTypePath.dailyOxygenSaturation,
          filterIntervalCivilDay(DataTypeFilter.dailyOxygenSaturation, date),
        );
        return { url: r.url, status: r.status, ok: r.ok, body: r.body, errorMessage: r.errorMessage, sampleCount: r.sampleCount };
      },
    },
    {
      name: "heart_rate",
      run: async (token) => {
        const r = await listAllDataPoints(
          token,
          DataTypePath.heartRate,
          filterSamplePhysicalDay(DataTypeFilter.heartRate, date),
        );
        return { url: r.url, status: r.status, ok: r.ok, body: r.body, errorMessage: r.errorMessage, sampleCount: r.sampleCount };
      },
    },
    {
      name: "sleep",
      run: async (token) => {
        const r = await listAllDataPoints(
          token,
          DataTypePath.sleep,
          filterIntervalCivilDay(DataTypeFilter.sleep, date),
        );
        return { url: r.url, status: r.status, ok: r.ok, body: r.body, errorMessage: r.errorMessage, sampleCount: r.sampleCount };
      },
    },
    {
      name: "respiratory_rate",
      run: async (token) => {
        const r = await listAllDataPoints(
          token,
          DataTypePath.respiratoryRate,
          filterSamplePhysicalDay(DataTypeFilter.respiratoryRate, date),
        );
        return { url: r.url, status: r.status, ok: r.ok, body: r.body, errorMessage: r.errorMessage, sampleCount: r.sampleCount };
      },
    },
  ];

  await mkdir(paths.spikeOutputDir, { recursive: true });

  const results: SpikeReport["results"] = [];
  const recommendations: string[] = [];

  console.log(`\n=== Google Health API spike for ${date} (user ${userId}) ===\n`);

  for (const probe of probes) {
    const result = await probe.run(accessToken);
    const sources = extractSources(result.body);

    results.push({
      name: probe.name,
      url: result.url,
      status: result.status,
      ok: result.ok,
      errorMessage: result.errorMessage,
      sampleCount: result.sampleCount,
      platforms: sources.platforms,
      devices: sources.devices,
    });

    const label = result.ok ? "OK" : "FAIL";
    const extra = result.sampleCount !== undefined ? ` (${result.sampleCount} points)` : "";
    const deviceHint =
      sources.devices.length > 0 ? ` [${sources.devices.join(", ")}]` : "";
    console.log(`${label} ${probe.name} [${result.status}]${extra}${deviceHint}`);
    if (!result.ok && result.errorMessage) {
      console.log(`       ${result.errorMessage.slice(0, 120)}`);
    }

    await writeFile(
      join(paths.spikeOutputDir, `${probe.name}.json`),
      JSON.stringify(result.body, null, 2),
      "utf8",
    );
  }

  const spo2 = results.find((r) => r.name === "oxygen_saturation_intraday");
  const dailySpo2 = results.find((r) => r.name === "daily_oxygen_saturation");
  if (spo2?.ok && (spo2.sampleCount ?? 0) === 0 && dailySpo2?.ok && (dailySpo2.sampleCount ?? 0) > 0) {
    recommendations.push(
      "No intraday SpO₂ samples but daily summary exists — device may only report sleep SpO₂ (common on Fitbit Air).",
    );
  }
  if (spo2 && !spo2.ok && spo2.status === 403) {
    recommendations.push("403 — confirm Health API scopes on Cloud Console Data Access page.");
  }
  if (!results.find((r) => r.name === "identity")?.ok) {
    recommendations.push("Identity call failed — check Google Health API is enabled for your project.");
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

  console.log(`\nOutput: ${paths.spikeOutputDir}`);
  console.log(`Report: ${reportPath}`);
  if (recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const r of recommendations) {
      console.log(`  • ${r}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
