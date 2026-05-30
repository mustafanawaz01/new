import { createHash, randomBytes } from "node:crypto";

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/** RFC 7636 PKCE: S256 challenge from random verifier. */
export function generatePkcePair(): PkcePair {
  const codeVerifier = base64UrlEncode(randomBytes(32));
  const digest = createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(digest);
  return { codeVerifier, codeChallenge };
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64url");
}
