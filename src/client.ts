import type { Config } from "./config.js";

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiRequest {
  method: Method;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

/** Error from the ZapZap API or the transport. `message` is safe to show to an agent. */
export class ZapZapApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ZapZapApiError";
  }
}

export interface ZapZapHttp {
  call(req: ApiRequest): Promise<unknown>;
}

/** Replace any occurrence of the credentials in a string. */
export function redact(text: string, config: Pick<Config, "apiKey" | "apiSecret">): string {
  let out = text;
  for (const s of [config.apiSecret, config.apiKey]) {
    if (s && s.length >= 4) out = out.split(s).join("[redacted]");
  }
  return out;
}

function serverMessage(payload: unknown): string | undefined {
  if (typeof payload === "string") return payload.slice(0, 500);
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const k of ["error", "message", "detail"]) {
      if (typeof o[k] === "string" && o[k]) return (o[k] as string).slice(0, 500);
    }
  }
  return undefined;
}

export function humanizeStatus(status: number, detail: string | undefined): string {
  const d = detail ? ` Server said: "${detail}"` : "";
  switch (status) {
    case 400:
      return `ZapZap rejected the request as invalid (400). Check the parameters (phone numbers need the country code, digits only, e.g. 5511999999999).${d}`;
    case 401:
    case 403:
      return `ZapZap rejected the credentials (${status}). Check ZAPZAP_API_KEY and ZAPZAP_API_SECRET in the MCP server configuration.${d}`;
    case 402:
      return `Insufficient ZapZap balance (402). The account owner must add funds in the dashboard.${d}`;
    case 404:
      return `Not found (404). The instance_id or the target resource does not exist. Call list_instances to get valid instance ids.${d}`;
    case 409:
      return `Conflict (409).${d}`;
    case 429:
      return `Rate limit exceeded (429). Wait a few seconds before retrying; do not loop.${d}`;
    default:
      if (status >= 500) return `ZapZap had a server error (${status}). Retry later; the instance may be disconnected (check get_instance_status).${d}`;
      return `ZapZap request failed with status ${status}.${d}`;
  }
}

export function createHttp(config: Config, fetchImpl: typeof fetch = globalThis.fetch): ZapZapHttp {
  return {
    async call(req: ApiRequest): Promise<unknown> {
      const url = new URL(config.baseUrl + req.path);
      for (const [k, v] of Object.entries(req.query ?? {})) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
      const headers: Record<string, string> = {
        "x-api-key": config.apiKey,
        "x-api-secret": config.apiSecret,
        Accept: "application/json",
        "User-Agent": "zapzap-mcp",
      };
      const init: RequestInit = { method: req.method, headers };
      if (req.body !== undefined && req.method !== "GET") {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(req.body);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      let res: Response;
      try {
        res = await fetchImpl(url, { ...init, signal: controller.signal });
      } catch (err) {
        const aborted = err instanceof Error && err.name === "AbortError";
        throw new ZapZapApiError(
          aborted
            ? `ZapZap did not answer within ${config.timeoutMs}ms. The request may or may not have been processed; check before retrying a send.`
            : `Could not reach ZapZap (${redact((err as Error).message, config)}). Check network access to ${new URL(config.baseUrl).host}.`,
          0,
        );
      } finally {
        clearTimeout(timer);
      }
      const text = await res.text();
      let payload: unknown = text || undefined;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          /* keep raw text */
        }
      }
      if (!res.ok) {
        throw new ZapZapApiError(
          redact(humanizeStatus(res.status, serverMessage(payload)), config),
          res.status,
        );
      }
      return payload;
    },
  };
}

/** Serialize a result for the model, capped to `maxChars`. */
export function formatResult(value: unknown, maxChars: number): string {
  const text = value === undefined ? "OK (empty response)" : JSON.stringify(value, null, 2);
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) +
    `\n... [truncated: response was ${text.length} characters, limit ${maxChars}. Narrow the query with limit/offset or filters.]`
  );
}
