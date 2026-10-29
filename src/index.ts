#!/usr/bin/env node
import { createServer as createHttpServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { createHttp } from "./client.js";
import { SERVER_VERSION, createServer } from "./server.js";

const HELP = `zapzap-mcp ${SERVER_VERSION} - MCP server for ZapZap API (WhatsApp)

Usage: zapzap-mcp [--http] [--port 3333]

Environment:
  ZAPZAP_API_KEY            required  (sent as x-api-key)
  ZAPZAP_API_SECRET         required  (sent as x-api-secret)
  ZAPZAP_INSTANCE_ID        optional  default instance for all tools
  ZAPZAP_BASE_URL           optional  default https://api.zapzapapi.com/api/v1
  ZAPZAP_TIMEOUT_MS         optional  default 20000
  ZAPZAP_MAX_RESPONSE_CHARS optional  default 20000
  ZAPZAP_READ_ONLY          optional  true = expose only read-only tools

Default transport is stdio. --http serves Streamable HTTP on 127.0.0.1 (/mcp).
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return;
  }
  const config = loadConfig();
  const http = createHttp(config);

  if (!argv.includes("--http")) {
    await createServer(config, http).connect(new StdioServerTransport());
    return;
  }

  const portIdx = argv.indexOf("--port");
  const port = Number(portIdx >= 0 ? argv[portIdx + 1] : process.env.ZAPZAP_MCP_PORT ?? 3333);
  const host = process.env.ZAPZAP_MCP_HOST ?? "127.0.0.1";
  const httpServer = createHttpServer(async (req, res) => {
    if (!req.url?.startsWith("/mcp")) {
      res.writeHead(404).end("Not found");
      return;
    }
    // Stateless: a fresh server and transport per request.
    const server = createServer(config, http);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) res.writeHead(500).end("Internal error");
    }
  });
  httpServer.listen(port, host, () => {
    console.error(`zapzap-mcp listening on http://${host}:${port}/mcp (put auth/TLS in front before exposing it)`);
  });
}

main().catch((err: unknown) => {
  // Never print env or stack traces that could include secrets.
  console.error(`zapzap-mcp: ${(err as Error).message}`);
  process.exit(1);
});
