export const DEFAULT_BASE_URL = "https://api.zapzapapi.com/api/v1";

export interface Config {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  /** Default instance used when a tool call omits `instance_id`. */
  defaultInstanceId?: string;
  timeoutMs: number;
  maxResponseChars: number;
  /** When true, only read-only tools are exposed. */
  readOnly: boolean;
}

function intFrom(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * Reads configuration from environment variables. Nothing is hardcoded.
 * Throws a human-readable error when credentials are missing.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const apiKey = env.ZAPZAP_API_KEY?.trim();
  const apiSecret = env.ZAPZAP_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing credentials. Set ZAPZAP_API_KEY and ZAPZAP_API_SECRET " +
        "(create them in the ZapZap dashboard under Settings > API: https://app.zapzapapi.com).",
    );
  }
  const baseUrl = (env.ZAPZAP_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("ZAPZAP_BASE_URL must start with http:// or https://");
  }
  return {
    apiKey,
    apiSecret,
    baseUrl,
    defaultInstanceId: env.ZAPZAP_INSTANCE_ID?.trim() || undefined,
    timeoutMs: intFrom(env.ZAPZAP_TIMEOUT_MS, 20_000, 1_000, 120_000),
    maxResponseChars: intFrom(env.ZAPZAP_MAX_RESPONSE_CHARS, 20_000, 1_000, 200_000),
    readOnly: /^(1|true|yes)$/i.test(env.ZAPZAP_READ_ONLY ?? ""),
  };
}
