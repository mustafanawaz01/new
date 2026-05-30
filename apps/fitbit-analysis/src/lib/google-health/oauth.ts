import { OAuth2Client } from "google-auth-library";
import type { GoogleHealthConfig } from "../../config.js";
import { GOOGLE_HEALTH_API_BASE } from "../../config.js";
import type { GoogleIdentity } from "../token-store.js";
import type { UserIdentity } from "./types.js";

export function createOAuth2Client(config: GoogleHealthConfig): OAuth2Client {
  return new OAuth2Client({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: config.GOOGLE_REDIRECT_URI,
  });
}

export function buildAuthorizeUrl(client: OAuth2Client, config: GoogleHealthConfig, state: string): string {
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: config.GOOGLE_HEALTH_SCOPES.split(/\s+/).filter(Boolean),
    state,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
  });
}

export async function exchangeCode(
  client: OAuth2Client,
  code: string,
): Promise<{ access_token: string; refresh_token: string; scope: string; token_type: string; expiry_date: number }> {
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing access_token or refresh_token — ensure prompt=consent on first auth");
  }
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope ?? "",
    token_type: tokens.token_type ?? "Bearer",
    expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
  };
}

export async function fetchUserIdentity(accessToken: string): Promise<GoogleIdentity> {
  const response = await fetch(`${GOOGLE_HEALTH_API_BASE}/users/me/identity`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`identity failed (${response.status}): ${text.slice(0, 500)}`);
  }
  const body = JSON.parse(text) as UserIdentity;
  return {
    legacyUserId: body.legacyUserId,
    healthUserId: body.healthUserId,
  };
}

export function applyTokensToClient(client: OAuth2Client, stored: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope?: string;
  token_type?: string;
}): void {
  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expiry_date: stored.expiry_date,
    scope: stored.scope,
    token_type: stored.token_type,
  });
}
