import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import { loadGoogleConfig, paths } from "../config.js";
import {
  buildAuthorizeUrl,
  createOAuth2Client,
  exchangeCode,
  fetchUserIdentity,
} from "../lib/google-health/oauth.js";
import { writeGoogleTokens } from "../lib/token-store.js";

interface PendingOAuthState {
  state: string;
}

async function saveOAuthState(data: PendingOAuthState): Promise<void> {
  await writeFile(paths.oauthStateFile, JSON.stringify(data, null, 2), "utf8");
}

async function loadOAuthState(): Promise<PendingOAuthState> {
  const raw = await readFile(paths.oauthStateFile, "utf8");
  return JSON.parse(raw) as PendingOAuthState;
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

async function main(): Promise<void> {
  const config = loadGoogleConfig();
  const client = createOAuth2Client(config);
  const state = randomBytes(16).toString("hex");
  await saveOAuthState({ state });

  const authorizeUrl = buildAuthorizeUrl(client, config, state);
  const port = config.GOOGLE_AUTH_PORT;
  const redirectPath = new URL(config.GOOGLE_REDIRECT_URI).pathname;

  console.log("\n=== Fitbit Analysis — Google Health API OAuth ===\n");
  console.log("Setup: docs/GOOGLE-HEALTH-SETUP.md");
  console.log("Redirect:", config.GOOGLE_REDIRECT_URI);
  console.log("\nOpen this URL in your browser:\n");
  console.log(authorizeUrl);
  console.log(`\nWaiting for callback on port ${port}… (Ctrl+C to cancel)\n`);

  await new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end("Bad request");
          return;
        }

        const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        if (requestUrl.pathname !== redirectPath) {
          res.writeHead(404);
          res.end(htmlPage("Not found", "<p>Unknown path.</p>"));
          return;
        }

        const error = requestUrl.searchParams.get("error");
        if (error) {
          const desc = requestUrl.searchParams.get("error_description") ?? "";
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(htmlPage("Authorization denied", `<p>${error}: ${desc}</p>`));
          server.close();
          reject(new Error(`${error}: ${desc}`));
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const returnedState = requestUrl.searchParams.get("state");
        const pending = await loadOAuthState();

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(htmlPage("Missing code", "<p>No authorization code.</p>"));
          return;
        }

        if (returnedState !== pending.state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(htmlPage("Invalid state", "<p>CSRF state mismatch. Run npm run auth again.</p>"));
          server.close();
          reject(new Error("State mismatch"));
          return;
        }

        const tokenPayload = await exchangeCode(client, code);
        const identity = await fetchUserIdentity(tokenPayload.access_token);

        await writeGoogleTokens(paths.tokenFile, {
          ...tokenPayload,
          identity,
        });

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Success",
            `<h1>Authorized</h1>
             <p>Health user: <code>${identity.healthUserId ?? "—"}</code></p>
             <p>Legacy Fitbit user: <code>${identity.legacyUserId ?? "—"}</code></p>
             <p>Run <code>npm run spike</code>.</p>`,
          ),
        );

        console.log("Authorization successful.");
        console.log("Identity:", identity);
        console.log("Tokens saved to:", paths.tokenFile);

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(htmlPage("Error", `<p>${String(err)}</p>`));
        server.close();
        reject(err);
      }
    });

    server.listen(port, "127.0.0.1");
    server.on("error", reject);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
