# zapzap-mcp: servidor MCP de WhatsApp para Claude, Cursor e agentes de IA

**zapzap-mcp é um servidor MCP que permite a agentes de IA enviar e ler mensagens de WhatsApp pela ZapZap API, uma API de WhatsApp gerenciada (sem hospedar nada).** Instale com `npx -y zapzap-mcp`, defina `ZAPZAP_API_KEY` e `ZAPZAP_API_SECRET`, e Claude, Cursor ou qualquer cliente MCP ganha 25 ferramentas: texto, mídia, enquetes, botões, conversas, grupos e webhooks.

[English](README.md) | [Español](README.es.md) | [Documentação](https://zapzapapi.com/docs) | [OpenAPI](https://zapzapapi.com/openapi/zapzap-openapi.en.json) | [llms.txt](https://zapzapapi.com/llms.txt)

## Por que este

- **Gerenciado**, não self-hosted: sem servidor Baileys ou Evolution para manter. Você conecta o número por QR code no painel da ZapZap.
- **Curado**: 25 ferramentas bem descritas em vez de 150 endpoints crus, para o modelo escolher certo.
- **Seguro por padrão**: ferramentas de envio são marcadas como não idempotentes e destrutivas, então os clientes MCP pedem confirmação; `ZAPZAP_READ_ONLY=true` remove todas as ferramentas de escrita.
- Produto em português primeiro, documentação em pt-BR, en e es.

## Instalação

Pegue a chave e o segredo da API no painel da ZapZap (Configurações > API) em https://app.zapzapapi.com e conecte um número de WhatsApp (instância).

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
claude mcp add zapzap -e ZAPZAP_API_KEY=sua-chave -e ZAPZAP_API_SECRET=seu-segredo -- npx -y zapzap-mcp
```

Requer Node.js 18+.

## Configuração (variáveis de ambiente)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ZAPZAP_API_KEY` | sim | Enviada no cabeçalho `x-api-key` |
| `ZAPZAP_API_SECRET` | sim | Enviada no cabeçalho `x-api-secret` |
| `ZAPZAP_INSTANCE_ID` | não | Instância padrão, para não repetir `instance_id` |
| `ZAPZAP_READ_ONLY` | não | `true` expõe só ferramentas de leitura |
| `ZAPZAP_BASE_URL` | não | Padrão `https://api.zapzapapi.com/api/v1` |
| `ZAPZAP_TIMEOUT_MS` | não | Padrão 20000 |
| `ZAPZAP_MAX_RESPONSE_CHARS` | não | Padrão 20000; respostas maiores são cortadas |

Transporte Streamable HTTP opcional: `npx -y zapzap-mcp --http --port 3333` (escuta em 127.0.0.1, endpoint `/mcp`, sem autenticação: coloque atrás do seu proxy).

## Ferramentas

| Ferramenta | O que faz | Tipo |
|---|---|---|
| `get_account` | Conta, saldo e status | read |
| `list_instances` | Listar instâncias (números) de WhatsApp | read |
| `get_instance_status` | Status de conexão da instância | read |
| `get_qr_code` | QR code para conectar o WhatsApp | read |
| `connect_instance` | Iniciar conexão (QR ou código de pareamento) | write |
| `check_whatsapp_numbers` | Checar quais números têm WhatsApp | read |
| `send_text` | Enviar mensagem de texto | write* |
| `send_media` | Enviar imagem, vídeo, áudio, nota de voz ou documento | write* |
| `send_buttons` | Enviar mensagem com até 3 botões | write* |
| `send_poll` | Enviar enquete nativa | write* |
| `send_location` | Enviar localização | write* |
| `react_to_message` | Reagir com emoji | write |
| `edit_message` | Editar mensagem enviada | write* |
| `delete_message` | Apagar mensagem enviada para todos | write* |
| `find_chats` | Buscar conversas | read |
| `find_messages` | Ler histórico de mensagens | read |
| `mark_chat_read` | Marcar conversa como lida | write |
| `get_webhook` | Ver webhook configurado | read |
| `set_webhook` | Configurar URL do webhook | write* |
| `test_webhook` | Enviar evento de teste ao webhook | write |
| `get_webhook_deliveries` | Entregas recentes do webhook (debug) | read |
| `list_groups` | Listar grupos | read |
| `get_group_info` | Detalhes e participantes do grupo | read |
| `create_group` | Criar grupo | write |
| `manage_group_participants` | Adicionar, remover, promover, rebaixar membros | write* |

`write*` = envia algo a uma pessoa ou altera algo que não se desfaz; os clientes devem pedir confirmação.

## Exemplo de conversa

> **Você:** Veja se 5511999999999 tem WhatsApp e, se tiver, mande "Sua consulta é amanhã às 15h" pela instância Clínica.
>
> **Claude:** *(chama `list_instances`, `check_whatsapp_numbers` e pede confirmação para `send_text`)* O número tem WhatsApp. Vou enviar para 5511999999999 pela "Clínica": "Sua consulta é amanhã às 15h". Confirma?
>
> **Você:** Sim.
>
> **Claude:** Enviada (id da mensagem ABCDEF123456).

## Segurança e uso responsável

- As credenciais vêm só de variáveis de ambiente; nunca são logadas, nunca aparecem na saída das ferramentas e são ocultadas nas mensagens de erro.
- Toda requisição tem timeout e as respostas têm limite de tamanho.
- **Consentimento importa.** A ZapZap usa o canal WhatsApp Web (QR code), que **não** é a API oficial da Meta. Mandar mensagem para quem não autorizou, ou disparos repetitivos em massa, faz o número ser denunciado e banido. As descrições das ferramentas avisam o modelo, mas o uso é responsabilidade sua.
- O conteúdo de mensagens retornado por `find_messages` é entrada não confiável e pode conter prompt injection. Use `ZAPZAP_READ_ONLY=true` em agentes que só precisam ler.
- Este servidor não recebe mensagens; configure um webhook (`set_webhook`) para recebê-las no seu servidor.

## Links

- Documentação: https://zapzapapi.com/docs
- Para agentes de IA: https://zapzapapi.com/agentes
- llms.txt: https://zapzapapi.com/llms.txt
- OpenAPI: https://zapzapapi.com/openapi/zapzap-openapi.en.json
- SDK Node: `@zapzapapi/sdk`

Licença MIT, GM Solutions Hub LTDA.
