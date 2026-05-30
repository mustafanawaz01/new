import { loadGoogleConfig } from "../config.js";
import { createOAuth2Client, buildAuthorizeUrl } from "../lib/google-health/oauth.js";
import { randomBytes } from "node:crypto";

function main(): void {
  const config = loadGoogleConfig();
  const client = createOAuth2Client(config);
  const url = buildAuthorizeUrl(client, config, randomBytes(8).toString("hex"));

  console.log("Google Health environment OK.\n");
  console.log("Client ID:", config.GOOGLE_CLIENT_ID.slice(0, 12) + "…");
  console.log("Redirect URI:", config.GOOGLE_REDIRECT_URI);
  console.log("Scopes:", config.GOOGLE_HEALTH_SCOPES);
  console.log("\nNext: npm run auth\n");
  console.log("Preview authorize URL (use auth for live flow):\n");
  console.log(url);
}

main();
