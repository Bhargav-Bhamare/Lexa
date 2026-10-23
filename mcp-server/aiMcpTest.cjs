const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

const MCP_URL = "http://localhost:3001/mcp";
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5:3b";
const MAX_ROUNDS = 8;
const MAX_TOOL_CALLS = 20;

const MUTATION_TOOLS = new Set([
  "create_task",
  "update_task",
  "delete_task",
  "add_shopping_item",
  "update_shopping_item",
  "delete_shopping_item",
  "create_reminder",
  "update_reminder",
  "delete_reminder",
]);

const VERIFICATION_TOOLS = {
  create_task: { listTool: "list_tasks", idField: null, operation: "create" },
  update_task: { listTool: "list_tasks", idField: "taskId", operation: "update" },
  delete_task: { listTool: "list_tasks", idField: "taskId", operation: "delete" },
  add_shopping_item: {
    listTool: "list_shopping_items",
    idField: null,
    operation: "create",
  },
  update_shopping_item: {
    listTool: "list_shopping_items",
    idField: "itemId",
    operation: "update",
  },
  delete_shopping_item: {
    listTool: "list_shopping_items",
    idField: "itemId",
    operation: "delete",
  },
  create_reminder: {
    listTool: "list_reminders",
    idField: null,
    operation: "create",
  },
  update_reminder: {
    listTool: "list_reminders",
    idField: "reminderId",
    operation: "update",
  },
  delete_reminder: {
    listTool: "list_reminders",
    idField: "reminderId",
    operation: "delete",
  },
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseArguments(value, toolName) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error(`Arguments for ${toolName} were not valid JSON.`);
    }
  }

  if (!isObject(value)) {
    throw new Error(`Arguments for ${toolName} must be a JSON object.`);
  }

  return value;
}

function validateValue(value, schema, path = "arguments") {
  if (Array.isArray(schema.anyOf)) {
    const errors = schema.anyOf.map((option) => validateValue(value, option, path));
    if (errors.some((error) => error === null)) return null;
    return `${path} does not match any permitted schema.`;
  }

  if (schema.type === "object") {
    if (!isObject(value)) return `${path} must be an object.`;

    for (const required of schema.required || []) {
      if (!(required in value)) return `${path}.${required} is required.`;
    }

    const properties = schema.properties || {};
    for (const [key, propertyValue] of Object.entries(value)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        if (schema.additionalProperties === false) {
          return `${path}.${key} is not an allowed field.`;
        }
        continue;
      }

      const error = validateValue(propertyValue, properties[key], `${path}.${key}`);
      if (error) return error;
    }
  } else if (schema.type === "string") {
    if (typeof value !== "string") return `${path} must be a string.`;
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      return `${path} is too short.`;
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      return `${path} is too long.`;
    }
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      return `${path} has an invalid format.`;
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) {
      return `${path} must be a valid date and time.`;
    }
  } else if (schema.type === "integer") {
    if (!Number.isSafeInteger(value)) return `${path} must be an integer.`;
  } else if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `${path} must be a number.`;
    }
  } else if (schema.type === "boolean") {
    if (typeof value !== "boolean") return `${path} must be a boolean.`;
  } else if (schema.type === "null") {
    if (value !== null) return `${path} must be null.`;
  } else if (Array.isArray(schema.type)) {
    const matchesType = schema.type.some((type) =>
      type === "null" ? value === null : typeof value === type
    );
    if (!matchesType) return `${path} has an invalid type.`;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return `${path} must be one of: ${schema.enum.join(", ")}.`;
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      return `${path} is below the minimum value.`;
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return `${path} exceeds the maximum value.`;
    }
  }

  return null;
}

function toOllamaSchema(inputSchema) {
  if (!isObject(inputSchema) || inputSchema.type !== "object") {
    throw new Error("MCP returned an unsupported tool input schema.");
  }

  const schema = structuredClone(inputSchema);
  delete schema.$schema;
  return schema;
}

function getToolText(result) {
  return (result.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

function parseRecords(result) {
  try {
    const parsed = JSON.parse(getToolText(result));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeForComparison(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return value;
}

async function confirmMutation(toolName, args) {
  console.log(`\nProposed ${toolName}:`);
  console.log("Arguments:", JSON.stringify(args, null, 2));

  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await readline.question(
      "Allow this change? Type YES to confirm: "
    );
    return answer.trim() === "YES";
  } finally {
    readline.close();
  }
}

async function verifyExistingDocument(client, tool, args) {
  const verification = VERIFICATION_TOOLS[tool.name];
  if (!verification || !verification.idField) return;

  const id = args[verification.idField];
  const result = await client.callTool({
    name: verification.listTool,
    arguments: {},
  });

  if (result.isError) {
    throw new Error(getToolText(result) || "Could not verify the target document.");
  }

  const exists = parseRecords(result).some(
    (record) => String(record._id) === String(id)
  );
  if (!exists) {
    throw new Error(`No existing document with ID ${id} was found; no write was attempted.`);
  }
}

async function verifyMutation(client, tool, args, result) {
  const verification = VERIFICATION_TOOLS[tool.name];
  if (!verification || result.isError) return;

  let expectedId = verification.idField
    ? args[verification.idField]
    : null;

  if (verification.operation === "create") {
    try {
      expectedId = JSON.parse(getToolText(result))._id;
    } catch {
      console.log("Persistence verification unavailable: tool returned no document ID.");
      return;
    }
  }

  const readResult = await client.callTool({
    name: verification.listTool,
    arguments: {},
  });

  if (readResult.isError) {
    console.log(
      `Persistence verification failed: ${getToolText(readResult) || "Read tool failed."}`
    );
    return;
  }

  const document = parseRecords(readResult).find(
    (record) => String(record._id) === String(expectedId)
  );

  if (verification.operation === "delete") {
    console.log(
      document
        ? `Persistence verification failed: document ${expectedId} still exists.`
        : `Verified deleted: ${expectedId} is absent from ${verification.listTool}.`
    );
    return;
  }

  if (!document) {
    console.log(`Persistence verification failed: document ${expectedId} was not found.`);
    return;
  }

  if (verification.operation === "update") {
    const changedFields = Object.keys(args).filter(
      (key) => key !== verification.idField
    );
    const mismatchedFields = changedFields.filter(
      (key) =>
        normalizeForComparison(document[key]) !==
        normalizeForComparison(args[key])
    );

    if (mismatchedFields.length > 0) {
      console.log(
        `Persistence verification failed for fields: ${mismatchedFields.join(", ")}.`
      );
      return;
    }
  }

  console.log(
    `Verified persisted through ${verification.listTool}: ${JSON.stringify(document)}`
  );
}

async function requestOllama(messages, tools) {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}.`);
  }

  const data = await response.json();
  if (!data.message || typeof data.message !== "object") {
    throw new Error("Ollama returned an invalid response.");
  }
  return data.message;
}

async function main() {
  const userRequest = process.argv.slice(2).join(" ").trim();
  if (!userRequest) {
    console.error('Usage: node aiMcpTest.cjs "Show my tasks"');
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    name: "lexa-ai-client",
    version: "1.0.0",
  });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));

  try {
    await client.connect(transport);
    console.log("Connected to Lexa MCP server.");

    const { tools } = await client.listTools();
    const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
    const ollamaTools = tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || tool.name,
        parameters: toOllamaSchema(tool.inputSchema),
      },
    }));

    console.log(`Discovered ${tools.length} MCP tools: ${tools.map((tool) => tool.name).join(", ")}`);

    const messages = [
      {
        role: "system",
        content:
          "You are Lexa, a household assistant. Use the available tools for saved household data. " +
          "For updates and deletes, first list the relevant records and use the exact _id from those results. " +
          "Never invent an ID or claim a write succeeded unless its tool result confirms success. " +
          "For updates, change only the fields the user requested. If multiple records match, ask which one. " +
          "After a successful create, update, or delete, read the relevant list again to verify the change. " +
          "Use only actual tool results and state clearly when a tool fails.",
      },
      { role: "user", content: userRequest },
    ];

    let toolCallCount = 0;
    const mutationFailures = new Map();
    const cancelledMutations = new Set();

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const assistantMessage = await requestOllama(messages, ollamaTools);
      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls || [];
      if (!Array.isArray(toolCalls)) {
        throw new Error("Ollama returned an invalid tool-call format.");
      }

      if (toolCalls.length === 0) {
        const answer = assistantMessage.content || "";
        console.log("\nLexa's answer:");
        console.log(
          mutationFailures.size > 0
            ? `A requested write did not succeed: ${[...mutationFailures.values()].join("; ")}`
            : cancelledMutations.size > 0
              ? "The requested write was cancelled. No change was made."
              : answer
        );
        return;
      }

      if (toolCalls.length > 3 || toolCallCount + toolCalls.length > MAX_TOOL_CALLS) {
        throw new Error("Lexa reached the tool-call limit.");
      }

      for (const toolCall of toolCalls) {
        toolCallCount += 1;
        const toolName = toolCall.function?.name;
        const tool = toolsByName.get(toolName);
        let args;
        let result;
        let attemptedMutation = false;

        if (!tool) {
          result = {
            isError: true,
            content: [{ type: "text", text: `Unknown MCP tool: ${toolName}` }],
          };
        } else {
          try {
            args = parseArguments(toolCall.function?.arguments, toolName);
            const validationError = validateValue(args, tool.inputSchema);
            if (validationError) throw new Error(validationError);

            if (
              MUTATION_TOOLS.has(toolName) &&
              VERIFICATION_TOOLS[toolName]?.idField
            ) {
              await verifyExistingDocument(client, tool, args);
            }

            console.log(`\nSelected tool: ${toolName}`);
            console.log("Arguments:", JSON.stringify(args, null, 2));

            if (MUTATION_TOOLS.has(toolName)) {
              const approved = await confirmMutation(toolName, args);
              if (!approved) {
                cancelledMutations.add(toolName);
                result = {
                  isError: false,
                  content: [
                    {
                      type: "text",
                      text: "The user declined. No change was made.",
                    },
                  ],
                };
              }
            }

            if (!result) {
              attemptedMutation = MUTATION_TOOLS.has(toolName);
              result = await client.callTool({
                name: toolName,
                arguments: args,
              });
              const toolText = getToolText(result);
              console.log(
                result.isError ? `Tool failed: ${toolText}` : `Tool result: ${toolText}`
              );

              if (result.isError && MUTATION_TOOLS.has(toolName)) {
                mutationFailures.set(
                  toolName,
                  `${toolName}: ${toolText || "Unknown error"}`
                );
              } else if (MUTATION_TOOLS.has(toolName)) {
                mutationFailures.delete(toolName);
                await verifyMutation(client, tool, args, result);
              }
            } else {
              console.log("Write cancelled; no MCP mutation was executed.");
            }
          } catch (error) {
            const errorText =
              error instanceof Error ? error.message : "Invalid tool arguments.";
            console.error(`Tool ${toolName} rejected: ${errorText}`);
            if (attemptedMutation) {
              mutationFailures.set(toolName, `${toolName}: ${errorText}`);
            }
            result = {
              isError: true,
              content: [{ type: "text", text: errorText }],
            };
          }
        }

        messages.push({
          role: "tool",
          tool_name: toolName,
          content: getToolText(result),
        });
      }
    }

    throw new Error("Lexa reached its reasoning limit. Please try a simpler request.");
  } finally {
    try {
      await client.close();
    } catch (error) {
      console.error(
        "MCP client cleanup failed:",
        error instanceof Error ? error.message : "Unknown cleanup error."
      );
    }
  }
}

main().catch((error) => {
  console.error("AI MCP test failed:", error.message);
  process.exitCode = 1;
});
