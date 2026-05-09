/**
 * Vite inlines `VITE_*` at build time; the dev server reads `.env` on start.
 * Normalizes values users often mis-paste in editors (quotes, line breaks).
 */
export function getGoogleMapsBrowserKey(): string | null {
  const raw = import.meta.env['VITE_GOOGLE_MAPS_API_KEY']
  if (raw == null) return null

  let s = String(raw).trim()
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length > 1) ||
    (s.startsWith("'") && s.endsWith("'") && s.length > 1)
  ) {
    s = s.slice(1, -1).trim()
  }
  s = s.replace(/[\r\n\t]/g, '')

  if (s.length === 0) return null

  const lower = s.toLowerCase()
  if (lower === 'your_key' || lower.includes('your_key_here') || s.includes('your_')) {
    return null
  }
  return s
}

export function mapApiLoadErrorToMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Failed to load Google Maps'
  }
}
