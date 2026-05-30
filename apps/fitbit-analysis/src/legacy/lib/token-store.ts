import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { FitbitTokenResponse } from "./fitbit-oauth.js";

export interface StoredFitbitTokens extends FitbitTokenResponse {
  obtained_at: string;
}

export async function readFitbitTokens(path: string): Promise<StoredFitbitTokens | null> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as StoredFitbitTokens;
    if (!parsed.access_token || !parsed.refresh_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeFitbitTokens(
  path: string,
  tokens: FitbitTokenResponse,
): Promise<StoredFitbitTokens> {
  const stored: StoredFitbitTokens = {
    ...tokens,
    obtained_at: new Date().toISOString(),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(stored, null, 2), "utf8");
  return stored;
}
