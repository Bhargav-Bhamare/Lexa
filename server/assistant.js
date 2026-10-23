
const express = require("express");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const router = express.Router();

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MCP_URL = "http://localhost:3001/mcp";
const MODEL = "qwen2.5:3b";

const READ_ONLY_TOOLS = [
  "list_tasks",
  "list_shopping_items",
  "list_reminders",
];

router.post("/chat", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Please enter a message.",
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      error: "Message must be 2000 characters or fewer.",
    });
  }

  const client = new Client({
    name: "lexa-express-client",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(MCP_URL)
  );

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();

    const ollamaTools = tools
      .filter((tool) => READ_ONLY_TOOLS.includes(tool.name))
      .map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || tool.name,
          parameters: tool.inputSchema,
        },
      }));

    const messages = [
      {
        role: "system",
        content:
          "You are Lexa, a concise household assistant. " +
          "Use the available read-only tools to answer questions about saved tasks, shopping items, and reminders. " +
          "Never claim you created, updated, or deleted anything. " +
          "Use only actual tool results. If data is missing, say so.",
      },
      {
        role: "user",
        content: message.trim(),
      },
    ];

    // Let the model request tools and continue until it has an answer.
    let finalAnswer = "";
    let finished = false;

    for (let round = 0; round < 4; round++) {
      const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools: ollamaTools,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }

      const data = await response.json();

      if (!data.message || typeof data.message !== "object") {
        throw new Error("Ollama returned an invalid response.");
      }

      messages.push(data.message);

      const toolCalls = data.message.tool_calls || [];

      if (!Array.isArray(toolCalls)) {
        throw new Error("Ollama returned an invalid tool-call format.");
      }

      if (toolCalls.length === 0) {
        finalAnswer = data.message.content || "";
        finished = true;
        break;
      }

      if (toolCalls.length > 3) {
        throw new Error("Too many tool calls in one round.");
      }

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name;
        const args = toolCall.function?.arguments;

        if (!READ_ONLY_TOOLS.includes(toolName)) {
          throw new Error(`Unsupported read-only tool: ${toolName}`);
        }

        if (!args || typeof args !== "object" || Array.isArray(args)) {
          throw new Error(`Invalid arguments for ${toolName}`);
        }

        const result = await client.callTool({
          name: toolName,
          arguments: args,
        });

        const toolText = (result.content || [])
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");

        messages.push({
          role: "tool",
          tool_name: toolName,
          content: result.isError
            ? `Tool failed: ${toolText || "Unknown error"}`
            : toolText,
        });
      }
    }

    if (!finished) {
      throw new Error("Lexa reached its tool-call limit. Please try a simpler request.");
    }

    return res.json({ reply: finalAnswer });
  } catch (error) {
    console.error("Ask Lexa failed:", error.message);

    return res.status(502).json({
      error: "Lexa couldn't process that request. Check that Ollama and the MCP server are running.",
    });
  } finally {
    try {
      await client.close();
    } catch (error) {
      console.error("MCP client cleanup failed:", error.message);
    }
  }
});

module.exports = router;
