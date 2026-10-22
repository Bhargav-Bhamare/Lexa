
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function main() {
  // 1. Connect to Lexa's existing MCP server
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
    // 2. Ask the local AI model to use list_tasks
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
        tools: [
          {
            type: "function",
            function: {
              name: "list_tasks",
              description: "Retrieve all tasks saved in Lexa.",
              parameters: {
                type: "object",
                properties: {},
                required: [],
              },
            },
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.message.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "list_tasks") {
      console.log("AI response:", data.message.content);
      return;
    }

    // 3. Execute the requested tool through MCP
    const result = await client.callTool({
      name: "list_tasks",
      arguments: toolCall.function.arguments,
    });

    // 4. Display the real result returned by Lexa
    console.log("\nActual task data from Lexa:");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
