
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

const UPDATE_TOOLS = {
  update_task: {
    listTool: "list_tasks",
    idField: "taskId",
    entity: "task",
    fields: ["title", "description", "dueAt", "priority", "status"],
  },
  update_shopping_item: {
    listTool: "list_shopping_items",
    idField: "itemId",
    entity: "shopping item",
    fields: ["name", "quantity", "purchased"],
  },
  update_reminder: {
    listTool: "list_reminders",
    idField: "reminderId",
    entity: "reminder",
    fields: ["title", "remindAt", "completed"],
  },
};

const UPDATE_TOOLS_LIST = Object.keys(UPDATE_TOOLS);
const pendingActions = new Map();
const ACTION_TTL = 5 * 60 * 1000;

function isValidIsoDate(value, nullable = false) {
  if (nullable && value === null) return true;
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

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

function validateUpdateAction(toolName, args) {
  const config = UPDATE_TOOLS[toolName];
  if (!config) return "This update action is not permitted.";
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return "Invalid action arguments.";
  }

  const allowedFields = [config.idField, ...config.fields];
  if (Object.keys(args).some((key) => !allowedFields.includes(key))) {
    return "The update contains unsupported fields.";
  }

  if (
    typeof args[config.idField] !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(args[config.idField])
  ) {
    return `A valid MongoDB ${config.entity} ID is required.`;
  }

  const changedFields = config.fields.filter((field) => args[field] !== undefined);
  if (changedFields.length === 0) {
    return "Provide at least one field to update.";
  }

  if (toolName === "update_task") {
    if (
      args.title !== undefined &&
      (typeof args.title !== "string" || !args.title.trim() || args.title.trim().length > 150)
    ) {
      return "Task title must contain 1–150 characters.";
    }
    if (
      args.description !== undefined &&
      (typeof args.description !== "string" || args.description.length > 1000)
    ) {
      return "Task description must be 1000 characters or fewer.";
    }
    if (args.dueAt !== undefined && !isValidIsoDate(args.dueAt, true)) {
      return "Task due date must be a valid ISO timestamp ending in Z, or null.";
    }
    if (args.priority !== undefined && !["low", "medium", "high"].includes(args.priority)) {
      return "Priority must be low, medium, or high.";
    }
    if (
      args.status !== undefined &&
      !["pending", "in_progress", "completed"].includes(args.status)
    ) {
      return "Status must be pending, in_progress, or completed.";
    }
  }

  if (toolName === "update_shopping_item") {
    if (
      args.name !== undefined &&
      (typeof args.name !== "string" || !args.name.trim() || args.name.trim().length > 100)
    ) {
      return "Shopping item name must contain 1–100 characters.";
    }
    if (
      args.quantity !== undefined &&
      (!Number.isInteger(args.quantity) || args.quantity < 1)
    ) {
      return "Quantity must be a positive integer.";
    }
    if (args.purchased !== undefined && typeof args.purchased !== "boolean") {
      return "Purchased must be a boolean.";
    }
  }

  if (toolName === "update_reminder") {
    if (
      args.title !== undefined &&
      (typeof args.title !== "string" || !args.title.trim() || args.title.trim().length > 150)
    ) {
      return "Reminder title must contain 1–150 characters.";
    }
    if (args.remindAt !== undefined && !isValidIsoDate(args.remindAt)) {
      return "Reminder time must be a valid ISO timestamp ending in Z.";
    }
    if (args.completed !== undefined && typeof args.completed !== "boolean") {
      return "Completed must be a boolean.";
    }
  }

  return null;
}

function validatePendingAction(action) {
  if (CREATE_TOOLS.includes(action.toolName)) {
    return validateCreateAction(action.toolName, action.args);
  }
  if (UPDATE_TOOLS[action.toolName]) {
    return validateUpdateAction(action.toolName, action.args);
  }
  return "This action is not permitted.";
}

function createActionPreview(toolName, args, existing = null) {
  const updateConfig = UPDATE_TOOLS[toolName];
  const entity = updateConfig
    ? updateConfig.entity
    : toolName === "create_task"
      ? "task"
      : toolName === "add_shopping_item"
        ? "shopping item"
        : "reminder";
  const labelField = entity === "shopping item" ? "name" : "title";
  const fieldLabels = {
    title: "Title",
    name: "Name",
    description: "Description",
    dueAt: "Due date",
    remindAt: "Reminder time",
    priority: "Priority",
    status: "Status",
    quantity: "Quantity",
    purchased: "Purchased",
    completed: "Completed",
  };
  const changes = (updateConfig ? updateConfig.fields : Object.keys(args))
    .filter((field) => field !== updateConfig?.idField && args[field] !== undefined)
    .map((field) => ({
      field,
      label: fieldLabels[field] || field,
      ...(existing ? { from: existing[field] ?? null } : {}),
      to: args[field],
    }));

  return {
    kind: updateConfig ? "update" : "create",
    entity,
    itemLabel: existing?.[labelField] || args[labelField] || entity,
    changes,
  };
}

function getListedRecords(result) {
  try {
    const value = JSON.parse(getToolText(result));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function findUpdateCandidates(records, message, config) {
  const requestedId = message.match(/\b[a-fA-F0-9]{24}\b/);
  if (requestedId) {
    return records.filter((record) => String(record._id) === requestedId[0]);
  }

  const labelField = config.entity === "shopping item" ? "name" : "title";
  const requestedText = message.toLocaleLowerCase();
  const matches = records.filter(
    (record) =>
      typeof record[labelField] === "string" &&
      record[labelField].trim() &&
      requestedText.includes(record[labelField].trim().toLocaleLowerCase())
  );

  if (matches.length < 2) return matches;

  const longestLabelLength = Math.max(
    ...matches.map((record) => record[labelField].trim().length)
  );
  return matches.filter(
    (record) => record[labelField].trim().length === longestLabelLength
  );
}

function requestedUpdateFields(toolName, message) {
  const text = message.toLocaleLowerCase();
  const rules = {
    update_task: {
      title: /\b(title|rename|retitle)\b/,
      description: /\b(description|details|notes)\b/,
      dueAt: /\b(due date|due at|deadline|due)\b/,
      priority: /\bpriority\b/,
      status: /\b(status|completed|complete|done|in progress|pending|finish(?:ed)?)\b/,
    },
    update_shopping_item: {
      name: /\b(rename|item name|name)\b/,
      quantity: /\b(quantity|amount|how many|count|number of)\b/,
      purchased: /\b(purchased|bought|buy|check off|tick off)\b/,
    },
    update_reminder: {
      title: /\b(title|rename|retitle)\b/,
      remindAt:
        /\b(date|time|schedule|reschedul|tomorrow|today|tonight|morning|afternoon|evening|next week|next month)\b|\b\d{4}-\d{2}-\d{2}\b/,
      completed: /\b(completed|complete|done|finished)\b/,
    },
  };

  return Object.entries(rules[toolName] || {})
    .filter(([, pattern]) => pattern.test(text))
    .map(([field]) => field);
}

function valuesMatch(left, right) {
  if (left === right) return true;
  if (left == null || right == null) return left == null && right == null;
  const leftDate = typeof left === "string" ? Date.parse(left) : NaN;
  const rightDate = typeof right === "string" ? Date.parse(right) : NaN;
  return !Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate === rightDate;
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

function parseToolArguments(value, toolName) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error(`Ollama returned invalid JSON arguments for ${toolName}.`);
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Ollama returned invalid arguments for ${toolName}.`);
  }
  return value;
}

// Cancel an action without executing it.
router.post("/cancel", (req, res) => {
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

  pendingActions.delete(actionId);
  return res.json({ message: "Pending action cancelled." });
});

// Execute only a pending, validated write action after confirmation.
router.post("/confirm", async (req, res) => {
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

  const validationError = validatePendingAction(action);

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

    if (
      !tool ||
      (!CREATE_TOOLS.includes(tool.name) && !UPDATE_TOOLS[tool.name])
    ) {
      return res.status(400).json({
        error: "This action is not an available write tool.",
      });
    }

    const finalValidationError = validatePendingAction(action);

    if (finalValidationError) {
      return res.status(400).json({ error: finalValidationError });
    }

    const updateConfig = UPDATE_TOOLS[action.toolName];
    if (updateConfig) {
      const listResult = await client.callTool({
        name: updateConfig.listTool,
        arguments: {},
      });

      if (listResult.isError) {
        return res.status(502).json({
          error: getToolText(listResult) || "Could not verify the item before updating.",
        });
      }

      const existing = getListedRecords(listResult).find(
        (record) => String(record._id) === action.args[updateConfig.idField]
      );

      if (!existing) {
        return res.status(404).json({
          error: "This item no longer exists. Ask Lexa to find it again.",
        });
      }

      if (
        updateConfig.fields.some(
          (field) => !valuesMatch(existing[field], action.existing?.[field])
        )
      ) {
        return res.status(409).json({
          error: "This item changed after the preview. Ask Lexa to prepare an updated preview.",
        });
      }
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
    const allowedTools = [
      ...READ_ONLY_TOOLS,
      ...CREATE_TOOLS,
      ...UPDATE_TOOLS_LIST,
    ];
    const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

    const ollamaTools = tools
      .filter((tool) => allowedTools.includes(tool.name))
      .map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || tool.name,
          parameters: Object.fromEntries(
            Object.entries(tool.inputSchema).filter(([key]) => key !== "$schema")
          ),
        },
      }));

    const recordsByListTool = new Map();
    const messages = [
      {
        role: "system",
        content:
          "You are Lexa, a concise household assistant. " +
          "Use tools to answer questions about saved tasks, shopping items, and reminders. " +
          "For create and update actions, request the appropriate tool with accurate arguments; " +
          "the application will show a preview and require confirmation before executing it. " +
          "For updates, first list existing records, choose the exact matching document using its actual _id, " +
          "and never invent an ID. If multiple items match, ask the user which item they mean. " +
          "Prepare updates containing only the fields the user requested. Never turn an update into a create. " +
          "Never claim a write succeeded unless the application confirms success. " +
          "Use actual tool results and do not invent saved data.",
      },
      { role: "user", content: message.trim() },
    ];

    let finalAnswer = "";
    let finished = false;

    for (let round = 0; round < 6; round++) {
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
        const tool = toolsByName.get(toolName);
        if (!tool || !allowedTools.includes(toolName)) {
          throw new Error(`Unsupported tool: ${toolName}`);
        }
        const args = parseToolArguments(toolCall.function?.arguments, toolName);

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
            preview: createActionPreview(toolName, args),
          });

          return res.json({
            reply: "Please review the proposed action and confirm before I make any changes.",
            pendingAction: {
              id: actionId,
              toolName,
              args,
              preview: createActionPreview(toolName, args),
            },
          });
        }

        if (UPDATE_TOOLS[toolName]) {
          const updateConfig = UPDATE_TOOLS[toolName];
          let records = recordsByListTool.get(updateConfig.listTool);

          if (!records) {
            const listResult = await client.callTool({
              name: updateConfig.listTool,
              arguments: {},
            });

            if (listResult.isError) {
              return res.status(502).json({
                error: getToolText(listResult) || "Could not find the item to update.",
              });
            }

            records = getListedRecords(listResult);
            recordsByListTool.set(updateConfig.listTool, records);
          }

          const matches = findUpdateCandidates(records, message.trim(), updateConfig);
          if (matches.length === 0) {
            messages.push({
              role: "tool",
              tool_name: toolName,
              content:
                `No matching existing ${updateConfig.entity} was found in the current list. ` +
                "Ask the user to identify the item more specifically; do not create a replacement.",
            });
            return res.json({
              reply:
                `I couldn't identify an existing ${updateConfig.entity} from that request. ` +
                "No changes were made; please provide its exact title or name.",
            });
          }

          if (matches.length > 1) {
            const names = matches
              .map((record) =>
                updateConfig.entity === "shopping item" ? record.name : record.title
              )
              .join(", ");
            return res.json({
              reply:
                `I found multiple ${updateConfig.entity}s matching that request (${names}). ` +
                "Which one should I update? No changes were made.",
            });
          }

          const existing = matches[0];
          args[updateConfig.idField] = String(existing._id);
          const requestedFields = new Set(
            requestedUpdateFields(toolName, message.trim())
          );

          for (const field of updateConfig.fields) {
            if (
              args[field] !== undefined &&
              (!requestedFields.has(field) || valuesMatch(existing[field], args[field]))
            ) {
              delete args[field];
            }
          }

          if (!updateConfig.fields.some((field) => args[field] !== undefined)) {
            return res.json({
              reply:
                "I couldn't identify a supported field change from that request. " +
                "No changes were made; please specify exactly what to update.",
            });
          }

          const validationError = validateUpdateAction(toolName, args);
          if (validationError) {
            return res.status(400).json({ error: validationError });
          }

          const preview = createActionPreview(toolName, args, existing);
          const actionId = crypto.randomUUID();
          pendingActions.set(actionId, {
            toolName,
            args,
            existing,
            createdAt: Date.now(),
            preview,
          });

          return res.json({
            reply: "Please review the proposed update and confirm before I make any changes.",
            pendingAction: {
              id: actionId,
              toolName,
              args,
              preview,
            },
          });
        }

        const result = await client.callTool({
          name: toolName,
          arguments: args,
        });

        if (!result.isError && READ_ONLY_TOOLS.includes(toolName)) {
          recordsByListTool.set(toolName, getListedRecords(result));
        }

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
