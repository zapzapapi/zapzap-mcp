import type { Config } from "../src/config.js";

export const config: Config = {
  apiKey: "key_test_1234567890",
  apiSecret: "secret_test_abcdefghij",
  baseUrl: "https://api.example.test/api/v1",
  defaultInstanceId: undefined,
  timeoutMs: 1000,
  maxResponseChars: 2000,
  readOnly: false,
};

export interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

/** Fake fetch: records calls, answers with the given status/body. Never touches the network. */
export function fakeFetch(status = 200, body: unknown = { ok: true }, calls: Call[] = []): typeof fetch {
  return (async (input: any, init: any) => {
    calls.push({
      url: String(input),
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const text = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(text, { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}
