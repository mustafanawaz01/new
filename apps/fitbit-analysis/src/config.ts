import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadEnv({ path: resolve(packageRoot, ".env") });

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
].join(" ");

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required — see docs/GOOGLE-HEALTH-SETUP.md"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REDIRECT_URI: z.string().url().default("http://127.0.0.1:3030/callback"),
  GOOGLE_AUTH_PORT: z.coerce.number().int().min(1024).max(65535).default(3030),
  GOOGLE_HEALTH_SCOPES: z.string().default(DEFAULT_SCOPES),
  GOOGLE_SPIKE_DATE: z.string().default("today"),
});

export type GoogleHealthConfig = z.infer<typeof googleEnvSchema>;

export function loadGoogleConfig(): GoogleHealthConfig {
  const parsed = googleEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${message}`);
  }
  return parsed.data;
}

export const paths = {
  packageRoot,
  tokenFile: resolve(packageRoot, ".google-health-tokens.json"),
  oauthStateFile: resolve(packageRoot, ".google-oauth-state.json"),
  spikeOutputDir: resolve(packageRoot, "spike-output"),
} as const;

export const GOOGLE_HEALTH_API_BASE = "https://health.googleapis.com/v4";
