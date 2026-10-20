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

    // Invoke the real HomeFlow tool.
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