import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tools, normalizeNumber, CONSENT } from "../src/tools.js";
import { activeTools } from "../src/server.js";
import { config } from "./helpers.js";

const spec: string[] = JSON.parse(readFileSync(new URL("../../test/openapi-operations.json", import.meta.url), "utf8"));

function toTemplate(path: string, inst: string): string {
  return path.replace(`/instances/${inst}`, "/instances/{id}").replace(`/${inst}/`, "/{instanceId}/");
}

test("between 15 and 25 curated tools, unique names", () => {
  assert.ok(tools.length >= 15 && tools.length <= 25, `got ${tools.length}`);
  assert.equal(new Set(tools.map((t) => t.name)).size, tools.length);
});

test("every tool maps to a real OpenAPI operation", () => {
  const sampleArgs: Record<string, any> = {
    number: "5511999999999", numbers: ["5511999999999"], text: "t", type: "image", file_url: "https://a.b/c.png",
    buttons: [{ text: "a", id: "1" }], question: "q", options: ["a", "b"], latitude: 1, longitude: 2, message_id: "m",
    emoji: "x", url: "https://a.b", group_jid: "1@g.us", action: "add", participants: ["5511999999999"], name: "n",
  };
  for (const t of tools) {
    const req = t.build(sampleArgs, "INST");
    const key = `${req.method} ${toTemplate(req.path, "INST")}`;
    assert.ok(spec.includes(key), `${t.name} -> ${key} not in OpenAPI`);
  }
});

test("send tools: consent warning, destructive, not idempotent", () => {
  for (const name of ["send_text", "send_media", "send_buttons", "send_poll", "send_location"]) {
    const t = tools.find((x) => x.name === name)!;
    assert.ok(t.description.includes(CONSENT), name);
    assert.match(t.description, /ban|restrict/);
    assert.equal(t.annotations.readOnlyHint, false);
    assert.equal(t.annotations.destructiveHint, true);
    assert.equal(t.annotations.idempotentHint, false);
  }
});

test("read tools are readOnly and idempotent", () => {
  for (const name of ["get_account", "list_instances", "get_instance_status", "find_messages", "list_groups", "check_whatsapp_numbers"]) {
    const t = tools.find((x) => x.name === name)!;
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.annotations.idempotentHint, true);
  }
});

test("every tool has a useful description", () => {
  for (const t of tools) assert.ok(t.description.length > 80, t.name);
});

test("readOnly mode hides write tools", () => {
  const ro = activeTools({ ...config, readOnly: true });
  assert.ok(ro.length > 0 && ro.every((t) => t.annotations.readOnlyHint));
  assert.ok(!ro.some((t) => t.name === "send_text"));
});

test("phone numbers are normalized, JIDs untouched", () => {
  assert.equal(normalizeNumber("+55 (11) 99999-9999"), "5511999999999");
  assert.equal(normalizeNumber("123@g.us"), "123@g.us");
});

test("send_media requires doc_name for documents", () => {
  const t = tools.find((x) => x.name === "send_media")!;
  assert.throws(() => t.build({ number: "5511999999999", type: "document", file_url: "https://a.b/x.pdf" }, "i"), /doc_name/);
});

test("path-unsafe instance ids are encoded", () => {
  const t = tools.find((x) => x.name === "send_text")!;
  assert.equal(t.build({ number: "5511999999999", text: "a" }, "a/b").path, "/a%2Fb/send/text");
});
