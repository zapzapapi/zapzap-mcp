import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { createHttp } from "../src/client.js";
import { tools } from "../src/tools.js";
import { config, fakeFetch, type Call } from "./helpers.js";

async function connect(status = 200, body: unknown = { messageId: "A1", status: "sent" }, cfg = config) {
  const calls: Call[] = [];
  const server = createServer(cfg, createHttp(cfg, fakeFetch(status, body, calls)));
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, calls };
}

test("lists all tools with annotations and schemas", async () => {
  const { client } = await connect();
  const { tools: listed } = await client.listTools();
  assert.equal(listed.length, tools.length);
  const send = listed.find((t) => t.name === "send_text")!;
  assert.equal(send.annotations?.destructiveHint, true);
  assert.equal(send.annotations?.idempotentHint, false);
  assert.ok(send.inputSchema.properties && "number" in send.inputSchema.properties);
});

test("send_text goes through with default instance and headers", async () => {
  const { client, calls } = await connect(200, { messageId: "A1" }, { ...config, defaultInstanceId: "inst-1" });
  const res: any = await client.callTool({ name: "send_text", arguments: { number: "+55 11 99999-9999", text: "Oi" } });
  assert.notEqual(res.isError, true);
  assert.match(res.content[0].text, /A1/);
  assert.equal(calls[0]!.url, "https://api.example.test/api/v1/inst-1/send/text");
  assert.equal(calls[0]!.body.number, "5511999999999");
  assert.equal(calls[0]!.headers["x-api-key"], config.apiKey);
});

test("missing instance gives actionable error, no HTTP call", async () => {
  const { client, calls } = await connect();
  const res: any = await client.callTool({ name: "get_instance_status", arguments: {} });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /list_instances/);
  assert.equal(calls.length, 0);
});

test("invalid input is rejected before any HTTP call", async () => {
  const { client, calls } = await connect();
  const res: any = await client
    .callTool({ name: "send_poll", arguments: { instance_id: "i", number: "5511999999999", question: "q", options: ["only one"] } })
    .catch((e) => ({ isError: true, content: [{ text: String(e) }] }));
  assert.equal(res.isError, true);
  assert.equal(calls.length, 0);
});

test("API 401 becomes isError without leaking secrets", async () => {
  const { client } = await connect(401, { error: `nope ${config.apiSecret}` });
  const res: any = await client.callTool({ name: "get_account", arguments: {} });
  assert.equal(res.isError, true);
  assert.ok(!res.content[0].text.includes(config.apiSecret));
  assert.match(res.content[0].text, /ZAPZAP_API_KEY/);
});

test("large responses are truncated", async () => {
  const { client } = await connect(200, { data: "y".repeat(10_000) });
  const res: any = await client.callTool({ name: "get_account", arguments: {} });
  assert.match(res.content[0].text, /truncated/);
  assert.ok(res.content[0].text.length < 2500);
});

test("read-only mode exposes only read tools", async () => {
  const { client } = await connect(200, {}, { ...config, readOnly: true });
  const { tools: listed } = await client.listTools();
  assert.ok(listed.length > 0 && listed.every((t) => t.annotations?.readOnlyHint === true));
});
