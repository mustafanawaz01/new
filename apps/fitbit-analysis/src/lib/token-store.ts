import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface GoogleIdentity {
  legacyUserId?: string;
  healthUserId?: string;
}

export interface GoogleStoredTokens {
  provider: "google";
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
  obtained_at: string;
  identity?: GoogleIdentity;
}

export async function readGoogleTokens(path: string): Promise<GoogleStoredTokens | null> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as GoogleStoredTokens;
    if (parsed.provider !== "google" || !parsed.access_token || !parsed.refresh_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeGoogleTokens(
  path: string,
  tokens: Omit<GoogleStoredTokens, "provider" | "obtained_at">,
): Promise<GoogleStoredTokens> {
  const stored: GoogleStoredTokens = {
    provider: "google",
    ...tokens,
    obtained_at: new Date().toISOString(),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(stored, null, 2), "utf8");
  return stored;
}
