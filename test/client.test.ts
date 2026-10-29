import { test } from "node:test";
import assert from "node:assert/strict";
import { createHttp, formatResult, redact, ZapZapApiError } from "../src/client.js";
import { loadConfig } from "../src/config.js";
import { config, fakeFetch, type Call } from "./helpers.js";

test("sends x-api-key / x-api-secret and JSON body", async () => {
  const calls: Call[] = [];
  const http = createHttp(config, fakeFetch(200, { a: 1 }, calls));
  const out = await http.call({ method: "POST", path: "/inst1/send/text", body: { number: "1", text: "hi" } });
  assert.deepEqual(out, { a: 1 });
  assert.equal(calls[0]!.url, "https://api.example.test/api/v1/inst1/send/text");
  assert.equal(calls[0]!.headers["x-api-key"], config.apiKey);
  assert.equal(calls[0]!.headers["x-api-secret"], config.apiSecret);
  assert.deepEqual(calls[0]!.body, { number: "1", text: "hi" });
});

test("query params are appended, undefined skipped", async () => {
  const calls: Call[] = [];
  const http = createHttp(config, fakeFetch(200, {}, calls));
  await http.call({ method: "GET", path: "/x", query: { limit: 5, other: undefined } });
  assert.equal(calls[0]!.url, "https://api.example.test/api/v1/x?limit=5");
});

for (const [status, hint] of [
  [401, "ZAPZAP_API_KEY"],
  [402, "balance"],
  [404, "list_instances"],
  [429, "Rate limit"],
  [500, "server error"],
] as const) {
  test(`HTTP ${status} gives a human message`, async () => {
    const http = createHttp(config, fakeFetch(status, { error: "boom" }));
    await assert.rejects(
      () => http.call({ method: "GET", path: "/x" }),
      (e: unknown) => e instanceof ZapZapApiError && e.status === status && e.message.includes(hint),
    );
  });
}

test("server message echoing the secret is redacted", async () => {
  const http = createHttp(config, fakeFetch(400, { error: `bad ${config.apiSecret} and ${config.apiKey}` }));
  await assert.rejects(
    () => http.call({ method: "GET", path: "/x" }),
    (e: Error) => !e.message.includes(config.apiSecret) && !e.message.includes(config.apiKey) && e.message.includes("[redacted]"),
  );
});

test("timeout becomes a clear error", async () => {
  const slow = ((_u: any, init: any) =>
    new Promise((_r, rej) => {
      init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })) as unknown as typeof fetch;
  const http = createHttp({ ...config, timeoutMs: 20 }, slow);
  await assert.rejects(() => http.call({ method: "GET", path: "/x" }), /did not answer within 20ms/);
});

test("network error does not leak credentials", async () => {
  const bad = (async () => {
    throw new Error(`connect failed with ${config.apiSecret}`);
  }) as unknown as typeof fetch;
  const http = createHttp(config, bad);
  await assert.rejects(() => http.call({ method: "GET", path: "/x" }), (e: Error) => !e.message.includes(config.apiSecret));
});

test("formatResult truncates and says so", () => {
  const text = formatResult({ big: "x".repeat(5000) }, 100);
  assert.ok(text.length < 400);
  assert.match(text, /truncated/);
  assert.equal(redact("a secret_test_abcdefghij b", config), "a [redacted] b");
});

test("loadConfig requires credentials and reads env only", () => {
  assert.throws(() => loadConfig({}), /ZAPZAP_API_KEY/);
  const c = loadConfig({ ZAPZAP_API_KEY: "k", ZAPZAP_API_SECRET: "s", ZAPZAP_READ_ONLY: "true", ZAPZAP_BASE_URL: "https://x.test/v1/" });
  assert.equal(c.readOnly, true);
  assert.equal(c.baseUrl, "https://x.test/v1");
});
