
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function main() {
  const client = new Client({
    name: "lexa-ai-client",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3001/mcp")
  );

  await client.connect(transport);
  console.log("Connected to Lexa MCP server");

  const userRequest = process.argv.slice(2).join(" ");

    if (!userRequest) {
    console.log('Usage: node aiMcpTest.cjs "Show my tasks"');
    return;
    }

  try {
    
    const { tools } = await client.listTools();

    const readOnlyToolNames = [
      "list_tasks",
      "list_shopping_items",
      "list_reminders",
    ];

    const ollamaTools = tools
      .filter((tool) => readOnlyToolNames.includes(tool.name))
      .map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || tool.name,
          parameters: tool.inputSchema,
        },
      }));

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:3b",
        messages: [
          {
            role: "user",
            content: userRequest,
          },
        ],
        tools: ollamaTools,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    
    const toolCall = data.message.tool_calls?.[0];

    if (!toolCall) {
      console.log("AI response:", data.message.content);
      return;
    }

    const allowedTools = [
      "list_tasks",
      "list_shopping_items",
      "list_reminders",
    ];

    const toolName = toolCall.function.name;

    if (!allowedTools.includes(toolName)) {
      throw new Error(`AI requested an unsupported tool: ${toolName}`);
    }

    const result = await client.callTool({
      name: toolName,
      arguments: toolCall.function.arguments,
    });


    
const toolText = result.content
  .filter((item) => item.type === "text")
  .map((item) => item.text)
  .join("\n");

const finalResponse = await fetch("http://localhost:11434/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "qwen2.5:3b",
    messages: [
      {
        role: "system",
        content:
          "You are Lexa, a household assistant. Answer using only the supplied tool result. Never invent tasks or claim actions that were not performed.",
      },
      {
        role: "user",
        content: userRequest,
      },
      {
        role: "assistant",
        content: "",
        tool_calls: [toolCall],
      },
      {
        role: "tool",
        tool_name: "list_tasks",
        content: toolText,
      },
    ],
    stream: false,
  }),
});

if (!finalResponse.ok) {
  throw new Error(`Ollama returned status ${finalResponse.status}`);
}

const finalData = await finalResponse.json();

console.log("\nLexa's answer:");
console.log(finalData.message.content);

  } finally {
    await client.close();
  }
}

main().catch(console.error);
