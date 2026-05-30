import type { AppConfig } from "../config.js";
import { FITBIT_AUTHORIZE_URL, FITBIT_TOKEN_URL } from "../config.js";
import type { FitbitTokenResponse } from "./token-store.js";

export function buildAuthorizeUrl(
  config: AppConfig,
  codeChallenge: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.FITBIT_CLIENT_ID,
    response_type: "code",
    scope: config.FITBIT_SCOPES,
    redirect_uri: config.FITBIT_REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });
  return `${FITBIT_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  config: AppConfig,
  code: string,
  codeVerifier: string,
): Promise<FitbitTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.FITBIT_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.FITBIT_REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.FITBIT_CLIENT_SECRET) {
    const basic = Buffer.from(`${config.FITBIT_CLIENT_ID}:${config.FITBIT_CLIENT_SECRET}`).toString(
      "base64",
    );
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers,
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  return JSON.parse(text) as FitbitTokenResponse;
}

export async function refreshAccessToken(
  config: AppConfig,
  refreshToken: string,
): Promise<FitbitTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.FITBIT_CLIENT_ID,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (config.FITBIT_CLIENT_SECRET) {
    const basic = Buffer.from(`${config.FITBIT_CLIENT_ID}:${config.FITBIT_CLIENT_SECRET}`).toString(
      "base64",
    );
    headers.Authorization = `Basic ${basic}`;
  }

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: "POST",
    headers,
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Token refresh failed (${response.status}): ${text}`);
  }

  return JSON.parse(text) as FitbitTokenResponse;
}
