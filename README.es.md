# zapzap-mcp: servidor MCP de WhatsApp para Claude, Cursor y agentes de IA

**zapzap-mcp es un servidor MCP que permite a los agentes de IA enviar y leer mensajes de WhatsApp mediante ZapZap API, una API de WhatsApp gestionada (sin alojar nada).** Instala con `npx -y zapzap-mcp`, define `ZAPZAP_API_KEY` y `ZAPZAP_API_SECRET`, y Claude, Cursor o cualquier cliente MCP obtiene 25 herramientas: texto, multimedia, encuestas, botones, chats, grupos y webhooks.

[English](README.md) | [Português](README.pt-BR.md) | [Documentación](https://zapzapapi.com/es/docs) | [OpenAPI](https://zapzapapi.com/openapi/zapzap-openapi.en.json) | [llms.txt](https://zapzapapi.com/llms.txt)

## Por qué este

- **Gestionado**, no autoalojado: sin servidor Baileys ni Evolution que mantener. Conectas el número por código QR en el panel de ZapZap.
- **Curado**: 25 herramientas bien descritas en lugar de 150 endpoints en bruto, para que el modelo elija bien.
- **Seguro por defecto**: las herramientas de envío se marcan como no idempotentes y destructivas, así los clientes MCP piden confirmación; `ZAPZAP_READ_ONLY=true` elimina toda herramienta de escritura.
- Producto con el portugués primero, documentación en pt-BR, en y es.

## Instalación

Obtén la clave y el secreto de la API en el panel de ZapZap (Ajustes > API) en https://app.zapzapapi.com y conecta un número de WhatsApp (instancia).

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
claude mcp add zapzap -e ZAPZAP_API_KEY=tu-clave -e ZAPZAP_API_SECRET=tu-secreto -- npx -y zapzap-mcp
```

Requiere Node.js 18+.

## Configuración (variables de entorno)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ZAPZAP_API_KEY` | sí | Se envía en la cabecera `x-api-key` |
| `ZAPZAP_API_SECRET` | sí | Se envía en la cabecera `x-api-secret` |
| `ZAPZAP_INSTANCE_ID` | no | Instancia por defecto, para no repetir `instance_id` |
| `ZAPZAP_READ_ONLY` | no | `true` expone solo herramientas de lectura |
| `ZAPZAP_BASE_URL` | no | Por defecto `https://api.zapzapapi.com/api/v1` |
| `ZAPZAP_TIMEOUT_MS` | no | Por defecto 20000 |
| `ZAPZAP_MAX_RESPONSE_CHARS` | no | Por defecto 20000; las respuestas mayores se recortan |

Transporte Streamable HTTP opcional: `npx -y zapzap-mcp --http --port 3333` (escucha en 127.0.0.1, endpoint `/mcp`, sin autenticación: ponlo detrás de tu proxy).

## Herramientas

| Herramienta | Qué hace | Tipo |
|---|---|---|
| `get_account` | Cuenta, saldo y estado | read |
| `list_instances` | Listar instancias (números) de WhatsApp | read |
| `get_instance_status` | Estado de conexión de la instancia | read |
| `get_qr_code` | Código QR para vincular WhatsApp | read |
| `connect_instance` | Iniciar conexión (QR o código de emparejamiento) | write |
| `check_whatsapp_numbers` | Comprobar qué números tienen WhatsApp | read |
| `send_text` | Enviar mensaje de texto | write* |
| `send_media` | Enviar imagen, video, audio, nota de voz o documento | write* |
| `send_buttons` | Enviar mensaje con hasta 3 botones | write* |
| `send_poll` | Enviar encuesta nativa | write* |
| `send_location` | Enviar ubicación | write* |
| `react_to_message` | Reaccionar con emoji | write |
| `edit_message` | Editar mensaje enviado | write* |
| `delete_message` | Eliminar mensaje enviado para todos | write* |
| `find_chats` | Buscar chats | read |
| `find_messages` | Leer historial de mensajes | read |
| `mark_chat_read` | Marcar chat como leído | write |
| `get_webhook` | Ver webhook configurado | read |
| `set_webhook` | Configurar URL del webhook | write* |
| `test_webhook` | Enviar evento de prueba al webhook | write |
| `get_webhook_deliveries` | Entregas recientes del webhook (debug) | read |
| `list_groups` | Listar grupos | read |
| `get_group_info` | Detalles y participantes del grupo | read |
| `create_group` | Crear grupo | write |
| `manage_group_participants` | Añadir, quitar, promover, degradar miembros | write* |

`write*` = envía algo a una persona o cambia algo irreversible; los clientes deben pedir confirmación.

## Ejemplo de conversación

> **Tú:** Comprueba si 5511999999999 tiene WhatsApp y, si es así, envía "Tu cita es mañana a las 15h" con la instancia Clínica.
>
> **Claude:** *(llama a `list_instances`, `check_whatsapp_numbers` y pide confirmar `send_text`)* El número tiene WhatsApp. Voy a enviar a 5511999999999 desde "Clínica": "Tu cita es mañana a las 15h". ¿Confirmas?
>
> **Tú:** Sí.
>
> **Claude:** Enviado (id del mensaje ABCDEF123456).

## Seguridad y uso responsable

- Las credenciales salen solo de variables de entorno; nunca se registran, nunca aparecen en la salida de las herramientas y se ocultan en los mensajes de error.
- Cada petición tiene timeout y las respuestas tienen límite de tamaño.
- **El consentimiento importa.** ZapZap usa el canal WhatsApp Web (código QR), que **no** es la API oficial de Meta. Escribir a quien no lo autorizó, o envíos masivos repetitivos, provoca denuncias y bloqueo del número. Las descripciones de las herramientas avisan al modelo, pero el uso es responsabilidad tuya.
- El contenido de mensajes devuelto por `find_messages` es entrada no confiable y puede contener prompt injection. Usa `ZAPZAP_READ_ONLY=true` en agentes que solo leen.
- Este servidor no recibe mensajes; configura un webhook (`set_webhook`) para recibirlos en tu servidor.

## Enlaces

- Documentación: https://zapzapapi.com/es/docs
- Para agentes de IA: https://zapzapapi.com/agentes
- llms.txt: https://zapzapapi.com/llms.txt
- OpenAPI: https://zapzapapi.com/openapi/zapzap-openapi.en.json
- SDK Node: `@zapzapapi/sdk`

Licencia MIT, GM Solutions Hub LTDA.
