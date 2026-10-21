import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: "lexa-test-client",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3001/mcp")
);

async function main() {
  try {
    // Initialize the MCP connection.
    await client.connect(transport);
    console.log("Connected to:", client.getServerVersion());

    // Discover the tools registered by the server.
    const { tools } = await client.listTools();

    console.log("\nAvailable tools:");
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
      console.log("  Input schema:", JSON.stringify(tool.inputSchema));
    }

    // const created = await client.callTool({
    //     name: "create_task",
    //     arguments: {
    //         title: "Test MCP task creation",
    //         description: "Created through the Lexa MCP client",
    //         priority: "high",
    //         status: "pending",
    //     },
    // });

    // console.log("\ncreate_task result:");
    // console.log(JSON.stringify(created, null, 2));


    // Invoke the task listing tool to verify that the task was created.
    const tasks = await client.callTool({
    name: "list_tasks",
    arguments: {},
    });

    console.log("\nlist_tasks after creation:");
    console.log(JSON.stringify(tasks, null, 2));

    //Add item 
    const addedItem = await client.callTool({
      name: "add_shopping_item",
      arguments: {
        name: "Milk",
        quantity: 2,
      },
    });
    
    //Shopping item listing tool
    const shoppingItems = await client.callTool({
      name: "list_shopping_items",
      arguments: {},
    });

    console.log("\nlist_shopping_items result:");
    console.log(JSON.stringify(shoppingItems, null, 2));
    

    console.log("\nadd_shopping_item result:");
    console.log(JSON.stringify(addedItem, null, 2));

    //Calling Update tool
    // const updated = await client.callTool({
    //   name: "update_task",
    //   arguments: {
    //     taskId: "6ad72895c0b0bc25c051b5b8",
    //     priority: "medium",
    //     status: "in_progress",
    //   },
    // });

    // console.log("\nupdate_task result:");
    // console.log(JSON.stringify(updated, null, 2));

    //Deleting Tool
    // const deleted = await client.callTool({
    //   name: "delete_task",
    //   arguments: {
    //     taskId: "6ad72895c0b0bc25c051b5b8",
    //   },
    // });

    // console.log("\ndelete_task result:");
    // console.log(JSON.stringify(deleted, null, 2));

    // Invoke the real Lexa tool.
    const result = await client.callTool({
      name: "list_tasks",
      arguments: {},
    });

    console.log("\nlist_tasks result:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("MCP client test failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();