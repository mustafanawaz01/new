import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface FitbitTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  user_id: string;
}

export interface StoredTokens extends FitbitTokenResponse {
  obtained_at: string;
}

export async function readTokens(path: string): Promise<StoredTokens | null> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed.access_token || !parsed.refresh_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeTokens(path: string, tokens: FitbitTokenResponse): Promise<StoredTokens> {
  const stored: StoredTokens = {
    ...tokens,
    obtained_at: new Date().toISOString(),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(stored, null, 2), "utf8");
  return stored;
}
