# zapzap-mcp: WhatsApp MCP server for Claude, Cursor and AI agents

**zapzap-mcp is an MCP server that lets AI agents send and read WhatsApp messages through ZapZap API, a managed WhatsApp API (no self-hosting).** Install with `npx -y zapzap-mcp`, set `ZAPZAP_API_KEY` and `ZAPZAP_API_SECRET`, and Claude, Cursor or any MCP client gets 25 curated tools: text, media, polls, buttons, chats, groups and webhooks.

[Português](README.pt-BR.md) | [Español](README.es.md) | [Docs](https://zapzapapi.com/en/docs) | [OpenAPI](https://zapzapapi.com/openapi/zapzap-openapi.en.json) | [llms.txt](https://zapzapapi.com/llms.txt)

## Why this one

- **Managed**, not self-hosted: no Baileys or Evolution server to run. You connect a number by QR code in the ZapZap dashboard.
- **Curated**: 25 well-described tools instead of 150 raw endpoints, so the model picks the right one.
- **Safe by default**: send tools are annotated as non-idempotent and destructive, so MCP clients ask for confirmation; `ZAPZAP_READ_ONLY=true` removes every write tool.
- Portuguese-first product, documentation in pt-BR, en and es.

## Install

Get your API key and secret in the ZapZap dashboard (Settings > API) at https://app.zapzapapi.com and connect a WhatsApp number (instance).

**Claude Desktop** (`claude_desktop_config.json`), **Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "zapzap": {
      "command": "npx",
      "args": ["-y", "zapzap-mcp"],
      "env": {
        "ZAPZAP_API_KEY": "your-api-key",
        "ZAPZAP_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add zapzap -e ZAPZAP_API_KEY=your-api-key -e ZAPZAP_API_SECRET=your-api-secret -- npx -y zapzap-mcp
```

Requires Node.js 18+.

## Configuration (environment variables)

| Variable | Required | Description |
|---|---|---|
| `ZAPZAP_API_KEY` | yes | Sent as the `x-api-key` header |
| `ZAPZAP_API_SECRET` | yes | Sent as the `x-api-secret` header |
| `ZAPZAP_INSTANCE_ID` | no | Default instance, so tools do not need `instance_id` |
| `ZAPZAP_READ_ONLY` | no | `true` exposes only read tools |
| `ZAPZAP_BASE_URL` | no | Default `https://api.zapzapapi.com/api/v1` |
| `ZAPZAP_TIMEOUT_MS` | no | Default 20000 |
| `ZAPZAP_MAX_RESPONSE_CHARS` | no | Default 20000; larger responses are truncated |

Optional Streamable HTTP transport: `npx -y zapzap-mcp --http --port 3333` (binds to 127.0.0.1, endpoint `/mcp`, no auth: put it behind your own proxy).

## Tools

| Tool | What it does | Type |
|---|---|---|
| `get_account` | Account, balance and status | read |
| `list_instances` | List WhatsApp instances (numbers) | read |
| `get_instance_status` | Connection status of an instance | read |
| `get_qr_code` | QR code to link WhatsApp | read |
| `connect_instance` | Start connection (QR or pairing code) | write |
| `check_whatsapp_numbers` | Check which numbers are on WhatsApp | read |
| `send_text` | Send a text message | write* |
| `send_media` | Send image, video, audio, voice note or document | write* |
| `send_buttons` | Send message with up to 3 buttons | write* |
| `send_poll` | Send a native poll | write* |
| `send_location` | Send a location pin | write* |
| `react_to_message` | React with an emoji | write |
| `edit_message` | Edit a sent message | write* |
| `delete_message` | Delete a sent message for everyone | write* |
| `find_chats` | Search chats | read |
| `find_messages` | Read message history | read |
| `mark_chat_read` | Mark chat as read | write |
| `get_webhook` | Show configured webhook | read |
| `set_webhook` | Configure webhook URL | write* |
| `test_webhook` | Send a test event to the webhook | write |
| `get_webhook_deliveries` | Recent webhook deliveries (debug) | read |
| `list_groups` | List groups | read |
| `get_group_info` | Group details and participants | read |
| `create_group` | Create a group | write |
| `manage_group_participants` | Add, remove, promote, demote members | write* |

`write*` = sends something to a person or changes things that cannot be reverted; clients should ask for confirmation.

## Example conversation

> **You:** Check if 5511999999999 is on WhatsApp and, if so, send "Your appointment is tomorrow at 3pm" using my Clinic instance.
>
> **Claude:** *(calls `list_instances`, `check_whatsapp_numbers`, then asks to confirm `send_text`)* The number is on WhatsApp. Sending to 5511999999999 from "Clinic": "Your appointment is tomorrow at 3pm". Confirm?
>
> **You:** Yes.
>
> **Claude:** Sent (message id ABCDEF123456).

## Security and responsible use

- Credentials come only from environment variables; they are never logged, never returned in tool output, and are redacted from error messages.
- Requests have a timeout and responses are size-capped.
- **Consent matters.** ZapZap uses the WhatsApp Web (QR code) channel, which is **not** Meta's official API. Messaging people who did not opt in, or sending repetitive bulk messages, gets numbers reported and banned. The tool descriptions tell the model this, but you are responsible for how you use it.
- Message content returned by `find_messages` is untrusted input: it can contain prompt injection. Use `ZAPZAP_READ_ONLY=true` for agents that only need to read.
- This server does not receive incoming messages; configure a webhook (`set_webhook`) to get them on your own server.

## Links

- Docs: https://zapzapapi.com/en/docs
- For AI agents: https://zapzapapi.com/agentes
- llms.txt: https://zapzapapi.com/llms.txt
- OpenAPI: https://zapzapapi.com/openapi/zapzap-openapi.en.json
- Node SDK: `@zapzapapi/sdk`

MIT License, GM Solutions Hub LTDA.
