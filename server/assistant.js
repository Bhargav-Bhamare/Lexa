
const express = require("express");
const crypto = require("crypto");
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

const CREATE_TOOLS = [
  "create_task",
  "add_shopping_item",
  "create_reminder",
];

const pendingActions = new Map();
const ACTION_TTL = 5 * 60 * 1000;

function validateCreateAction(toolName, args) {
  if (!CREATE_TOOLS.includes(toolName)) {
    return "This action is not permitted.";
  }

  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return "Invalid action arguments.";
  }

  const allowedFields = {
    create_task: ["title", "description", "dueAt", "priority", "status"],
    add_shopping_item: ["name", "quantity"],
    create_reminder: ["title", "remindAt"],
  };

  if (Object.keys(args).some((key) => !allowedFields[toolName].includes(key))) {
    return "The action contains unsupported fields.";
  }

  if (toolName === "create_task") {
    if (typeof args.title !== "string" || !args.title.trim() || args.title.trim().length > 150) {
      return "Task title must contain 1–150 characters.";
    }

    if (args.description !== undefined &&
        (typeof args.description !== "string" || args.description.length > 1000)) {
      return "Task description must be 1000 characters or fewer.";
    }

    if (args.dueAt !== undefined && args.dueAt !== null) {
      if (typeof args.dueAt !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(args.dueAt) ||
          Number.isNaN(Date.parse(args.dueAt))) {
        return "Task due date must be a valid ISO timestamp ending in Z, or null.";
      }
    }

    if (args.priority !== undefined &&
        !["low", "medium", "high"].includes(args.priority)) {
      return "Priority must be low, medium, or high.";
    }

    if (args.status !== undefined &&
        !["pending", "in_progress", "completed"].includes(args.status)) {
      return "Status must be pending, in_progress, or completed.";
    }
  }

  if (toolName === "add_shopping_item") {
    if (typeof args.name !== "string" || !args.name.trim() || args.name.trim().length > 100) {
      return "Shopping item name must contain 1–100 characters.";
    }

    if (args.quantity !== undefined &&
        (!Number.isInteger(args.quantity) || args.quantity < 1)) {
      return "Quantity must be a positive integer.";
    }
  }

  if (toolName === "create_reminder") {
    if (typeof args.title !== "string" || !args.title.trim() || args.title.trim().length > 150) {
      return "Reminder title must contain 1–150 characters.";
    }

    if (typeof args.remindAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(args.remindAt) ||
        Number.isNaN(Date.parse(args.remindAt))) {
      return "Reminder time must be a valid ISO timestamp ending in Z.";
    }
  }

  return null;
}

function cleanExpiredActions() {
  const now = Date.now();

  for (const [id, action] of pendingActions) {
    if (now - action.createdAt > ACTION_TTL) {
      pendingActions.delete(id);
    }
  }
}

function createMcpClient(name) {
  return {
    client: new Client({ name, version: "1.0.0" }),
    transport: new StreamableHTTPClientTransport(new URL(MCP_URL)),
  };
}

function getToolText(result) {
  return (result.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

// Cancel an action without executing it.
router.post("/cancel", (req, res) => {
  cleanExpiredActions();

  const { actionId } = req.body || {};

  if (typeof actionId !== "string" || !actionId.trim()) {
    return res.status(400).json({ error: "A valid action ID is required." });
  }

  if (!pendingActions.delete(actionId)) {
    return res.status(404).json({
      error: "This action is missing, expired, or already processed.",
    });
  }

  return res.json({ message: "Pending action cancelled." });
});

// Execute only a pending, validated create action after confirmation.
router.post("/confirm", async (req, res) => {
  cleanExpiredActions();

  const { actionId } = req.body || {};

  if (typeof actionId !== "string" || !actionId.trim()) {
    return res.status(400).json({ error: "A valid action ID is required." });
  }

  const action = pendingActions.get(actionId);

  if (!action) {
    return res.status(404).json({
      error: "This action is missing, expired, or already processed.",
    });
  }

  if (Date.now() - action.createdAt > ACTION_TTL) {
    pendingActions.delete(actionId);
    return res.status(410).json({
      error: "This confirmation has expired. Please ask Lexa again.",
    });
  }

  const validationError = validateCreateAction(action.toolName, action.args);

  if (validationError) {
    pendingActions.delete(actionId);
    return res.status(400).json({ error: validationError });
  }

  // Consume the ID before awaiting network operations, preventing reuse.
  pendingActions.delete(actionId);

  const { client, transport } = createMcpClient("lexa-confirm-client");

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const tool = tools.find((item) => item.name === action.toolName);

    if (!tool || !CREATE_TOOLS.includes(tool.name)) {
      return res.status(400).json({
        error: "This action is not an available create tool.",
      });
    }

    // Validate again immediately before calling the write tool.
    const finalValidationError = validateCreateAction(action.toolName, action.args);

    if (finalValidationError) {
      return res.status(400).json({ error: finalValidationError });
    }

    const result = await client.callTool({
      name: action.toolName,
      arguments: action.args,
    });

    const toolText = getToolText(result);

    if (result.isError) {
      return res.status(502).json({
        error: toolText || "The action failed.",
      });
    }

    return res.json({
      reply: `Action completed successfully.\n${toolText}`,
    });
  } catch (error) {
    console.error("Confirm action failed:", error.message);
    return res.status(502).json({
      error: "Lexa couldn't complete the action. Check that the MCP server is running.",
    });
  } finally {
    try {
      await client.close();
    } catch (error) {
      console.error("MCP client cleanup failed:", error.message);
    }
  }
});

// Ask Lexa.
router.post("/chat", async (req, res) => {
  cleanExpiredActions();

  const message = req.body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Please enter a message." });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      error: "Message must be 2000 characters or fewer.",
    });
  }

  const { client, transport } = createMcpClient("lexa-express-client");

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const allowedTools = [...READ_ONLY_TOOLS, ...CREATE_TOOLS];

    const ollamaTools = tools
      .filter((tool) => allowedTools.includes(tool.name))
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
          "Use tools to answer questions about saved tasks, shopping items, and reminders. " +
          "For create actions, request the appropriate tool with accurate arguments; " +
          "the application will ask the user to confirm before executing it. " +
          "Never claim a write succeeded unless the application confirms success. " +
          "Use actual tool results and do not invent saved data.",
      },
      { role: "user", content: message.trim() },
    ];

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

        if (!args || typeof args !== "object" || Array.isArray(args)) {
          throw new Error(`Invalid arguments for ${toolName}`);
        }

        if (CREATE_TOOLS.includes(toolName)) {
          const validationError = validateCreateAction(toolName, args);

          if (validationError) {
            return res.status(400).json({ error: validationError });
          }

          const actionId = crypto.randomUUID();

          pendingActions.set(actionId, {
            toolName,
            args,
            createdAt: Date.now(),
          });

          return res.json({
            reply: "Please review the proposed action and confirm before I make any changes.",
            pendingAction: {
              id: actionId,
              toolName,
              args,
            },
          });
        }

        if (!READ_ONLY_TOOLS.includes(toolName)) {
          throw new Error(`Unsupported tool: ${toolName}`);
        }

        const result = await client.callTool({
          name: toolName,
          arguments: args,
        });

        messages.push({
          role: "tool",
          tool_name: toolName,
          content: result.isError
            ? `Tool failed: ${getToolText(result) || "Unknown error"}`
            : getToolText(result),
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
