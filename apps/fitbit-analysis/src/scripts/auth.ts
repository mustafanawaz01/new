import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import { loadConfig, paths } from "../config.js";
import { generatePkcePair } from "../lib/pkce.js";
import { buildAuthorizeUrl, exchangeAuthorizationCode } from "../lib/fitbit-oauth.js";
import { writeTokens } from "../lib/token-store.js";

interface PendingPkce {
  codeVerifier: string;
  state: string;
}

async function savePkce(data: PendingPkce): Promise<void> {
  await writeFile(paths.pkceFile, JSON.stringify(data, null, 2), "utf8");
}

async function loadPkce(): Promise<PendingPkce> {
  const raw = await readFile(paths.pkceFile, "utf8");
  return JSON.parse(raw) as PendingPkce;
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = randomBytes(16).toString("hex");
  await savePkce({ codeVerifier, state });

  const authorizeUrl = buildAuthorizeUrl(config, codeChallenge, state);
  const port = config.FITBIT_AUTH_PORT;

  const redirect = new URL(config.FITBIT_REDIRECT_URI);
  if (redirect.port && Number(redirect.port) !== port) {
    console.warn(
      `Warning: FITBIT_AUTH_PORT=${port} but redirect URI port is ${redirect.port}. They should match.`,
    );
  }

  console.log("\n=== Fitbit Analysis — OAuth (PKCE) ===\n");
  console.log("1. Ensure your app is registered at https://dev.fitbit.com/apps");
  console.log("   Type: Personal | Callback:", config.FITBIT_REDIRECT_URI);
  console.log("\n2. Open this URL in your browser:\n");
  console.log(authorizeUrl);
  console.log(`\n3. Waiting for callback on port ${port}… (Ctrl+C to cancel)\n`);

  await new Promise<void>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end("Bad request");
          return;
        }

        const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);
        if (requestUrl.pathname !== new URL(config.FITBIT_REDIRECT_URI).pathname) {
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
          reject(new Error(`Authorization error: ${error} ${desc}`));
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const returnedState = requestUrl.searchParams.get("state");
        const pkce = await loadPkce();

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(htmlPage("Missing code", "<p>No authorization code in callback.</p>"));
          return;
        }

        if (returnedState !== pkce.state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(htmlPage("Invalid state", "<p>CSRF state mismatch. Run npm run auth again.</p>"));
          server.close();
          reject(new Error("State mismatch"));
          return;
        }

        const tokens = await exchangeAuthorizationCode(config, code, pkce.codeVerifier);
        await writeTokens(paths.tokenFile, tokens);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Success",
            `<h1>Authorized</h1><p>User ID: <code>${tokens.user_id}</code></p>
             <p>Scopes: ${tokens.scope}</p>
             <p>Tokens saved. You can close this tab and run <code>npm run spike</code>.</p>`,
          ),
        );

        console.log("Authorization successful.");
        console.log("User ID:", tokens.user_id);
        console.log("Scopes:", tokens.scope);
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

    server.listen(port, "127.0.0.1", () => {
      // Server ready
    });
    server.on("error", reject);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
