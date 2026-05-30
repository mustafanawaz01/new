import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadEnv({ path: resolve(packageRoot, ".env") });

const envSchema = z.object({
  FITBIT_CLIENT_ID: z.string().min(1, "FITBIT_CLIENT_ID is required — see docs/PHASE-0-DEVELOPER-REGISTRATION.md"),
  FITBIT_REDIRECT_URI: z.string().url().default("http://127.0.0.1:3030/callback"),
  FITBIT_CLIENT_SECRET: z.string().optional(),
  FITBIT_SCOPES: z
    .string()
    .default("profile oxygen_saturation heartrate sleep respiratory_rate temperature activity"),
  FITBIT_AUTH_PORT: z.coerce.number().int().min(1024).max(65535).default(3030),
  FITBIT_SPIKE_DATE: z.string().default("today"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${message}`);
  }
  return parsed.data;
}

export const paths = {
  packageRoot,
  tokenFile: resolve(packageRoot, ".fitbit-tokens.json"),
  pkceFile: resolve(packageRoot, ".fitbit-pkce.json"),
  spikeOutputDir: resolve(packageRoot, "spike-output"),
} as const;

export const FITBIT_AUTHORIZE_URL = "https://www.fitbit.com/oauth2/authorize";
export const FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token";
export const FITBIT_API_BASE = "https://api.fitbit.com";
