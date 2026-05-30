import { loadConfig } from "../config.js";
import { buildAuthorizeUrl } from "../lib/fitbit-oauth.js";
import { generatePkcePair } from "../lib/pkce.js";

function main(): void {
  const config = loadConfig();
  const { codeChallenge } = generatePkcePair();
  const authorizeUrl = buildAuthorizeUrl(config, codeChallenge, "check-env");

  console.log("Environment OK.\n");
  console.log("Client ID:", config.FITBIT_CLIENT_ID.slice(0, 6) + "…");
  console.log("Redirect URI:", config.FITBIT_REDIRECT_URI);
  console.log("Scopes:", config.FITBIT_SCOPES);
  console.log("\nAfter registering at https://dev.fitbit.com/apps/new run: npm run auth\n");
  console.log("Preview authorize URL (run auth for a live PKCE session):\n");
  console.log(authorizeUrl);
}

main();
