
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");


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

      const supportedToolNames = [
      "list_tasks",
      "list_shopping_items",
      "list_reminders",
      "create_task",
      "add_shopping_item",
      "create_reminder",
      "update_task",
      "delete_task",
    ];

    const { tools } = await client.listTools();

    const ollamaTools = tools
      .filter((tool) => supportedToolNames.includes(tool.name))
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
            role: "system",
            content: `You are Lexa, a household assistant.
        For update_task and delete_task, first use list_tasks to find the requested item.
        Use the exact MongoDB _id as taskId. Never invent IDs.
        If no unique match exists, ask the user to clarify.
        Only update the fields requested by the user.`,
          },
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

    if (!data.message || typeof data.message !== "object") {
      throw new Error("Ollama returned an invalid response.");
    }

    const toolCalls = data.message.tool_calls;

    if (toolCalls !== undefined && !Array.isArray(toolCalls)) {
      throw new Error("Ollama returned an invalid tool-call format.");
    }

    
    if (!toolCalls || toolCalls.length === 0) {
      console.log("AI response:", data.message.content);
      return;
    }

    if (toolCalls.length > 3) {
      throw new Error("AI requested too many tool calls.");
    }


      const allowedTools = [
      "list_tasks",
      "list_shopping_items",
      "list_reminders",
      "create_task",
      "add_shopping_item",
      "create_reminder",
      "update_task",
      "delete_task",
    ];

    
    const toolResults = [];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      const args = toolCall.function?.arguments;

      if (!allowedTools.includes(toolName)) {
        throw new Error(`Unsupported tool: ${toolName}`);
      }

      if (!args || typeof args !== "object" || Array.isArray(args)) {
        throw new Error(`Invalid arguments for ${toolName}`);
      }
      if (
        ["update_task", "delete_task"].includes(toolName) &&
        (!args.taskId || !/^[a-fA-F0-9]{24}$/.test(args.taskId))
      ) {
        const lookup = await client.callTool({
          name: "list_tasks",
          arguments: {},
        });

        const lookupText = (lookup.content || [])
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");

        console.log("\nTask lookup result:");
        console.log(lookupText);

        console.log(
          "\nLexa needs the task's exact MongoDB ID before it can update or delete it."
        );

        throw new Error(
          "Missing task ID. Use the task lookup result to identify the correct task, then retry."
        );
      }

      const isCreationTool = [
        "create_task",
        "add_shopping_item",
        "create_reminder",
      ].includes(toolName);

      if (isCreationTool) {
        console.log("\nProposed action:", toolName);
        console.log("Arguments:", JSON.stringify(args, null, 2));

        const rl = createInterface({ input: stdin, output: stdout });
        let answer;

        try {
          answer = await rl.question(
            "Allow this creation? Type YES to confirm: "
          );
        } finally {
          rl.close();
        }

        if (answer.trim() !== "YES") {
          console.log("Creation cancelled. No write was attempted.");

          toolResults.push({
            toolCall,
            toolName,
            toolText: "The user declined. No creation was performed.",
          });

          continue;
        }
      }

      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      const toolText = (result.content || [])
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");

      if (result.isError) {
        toolResults.push({
          toolCall,
          toolName,
          toolText: `Tool execution failed: ${toolText || "Unknown error"}`,
        });

        continue;
      }

      toolResults.push({
        toolCall,
        toolName,
        toolText,
      });
    }



const finalResponse = await fetch("http://localhost:11434/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "qwen2.5:3b",
    messages: [
      {
        role: "system",
        content:
          `You are Lexa, a household assistant.

            For update_task:
            1. If the task ID is unknown, call list_tasks first.
            2. Find the task matching the user's requested title.
            3. Use its exact MongoDB _id as taskId.
            4. Never invent or guess a task ID.
            5. If multiple tasks match, ask the user to clarify.
            6. Update only the fields requested by the user.

            For delete_task:
            1. Find the task using list_tasks if its ID is unknown.
            2. Use the exact MongoDB _id as taskId.
            3. Never invent or guess a task ID.
            4. Require explicit user confirmation before deletion.

            For all responses:
            - Answer using only actual tool results.
            - Never claim an action succeeded unless the tool confirms it.
            - If a field is null, missing, or unset, say it is not set.
            - Never describe an unset due date as future or overdue.
            - Keep answers concise and factual.
            When listing tasks, include each task's exact MongoDB _id and priority. Do not omit IDs.`,
      },
      {
        role: "user",
        content: userRequest,
      },
      
      {
            role: "assistant",
            content: "",
            tool_calls: toolResults.map(({ toolCall, toolName }) => ({
              ...toolCall,
              function: {
                ...toolCall.function,
                name: toolName,
              },
            })),
      },
          ...toolResults.map(({ toolName, toolText }) => ({
            role: "tool",
            tool_name: toolName,
            content: toolText,
    })),

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
