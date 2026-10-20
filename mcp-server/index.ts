
import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the existing backend's environment variables.
dotenv.config({
  path: path.resolve(__dirname, "../server/.env"),
});

// Resolve backend dependencies from the existing server project.
const backendRequire = createRequire(
  path.resolve(__dirname, "../server/server.js")
);

const mongoose = backendRequire("mongoose");
const { listTasks } = backendRequire("./services/taskService") as {
  listTasks: () => Promise<unknown[]>;
};

const app = express();
app.use(express.json());

type McpSession = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

const sessions = new Map<string, McpSession>();

function createMcpSession(): McpSession {
  const server = new McpServer({
    name: "homeflow-mcp",
    version: "1.0.0",
  });

  // Register our first real HomeFlow tool.
  server.registerTool(
    "list_tasks",
    {
      title: "List HomeFlow tasks",
      description: "Retrieve all tasks saved in HomeFlow, newest first.",
      inputSchema: {},
    },
    async () => {
      try {
        const tasks = await listTasks();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("list_tasks failed:", error);

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Failed to retrieve HomeFlow tasks. Check the server logs.",
            },
          ],
        };
      }
    }
  );

  let transport!: StreamableHTTPServerTransport;

  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: randomUUID,
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, { server, transport });
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
  };

  return { server, transport };
}

function getSession(req: Request, res: Response): McpSession | undefined {
  const sessionId = req.headers["mcp-session-id"];

  if (typeof sessionId !== "string") {
    res.status(400).json({ error: "Missing MCP session ID" });
    return undefined;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: "Unknown MCP session" });
    return undefined;
  }

  return session;
}

app.post("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];

    if (typeof sessionId === "string") {
      const session = sessions.get(sessionId);

      if (!session) {
        res.status(404).json({ error: "Unknown MCP session" });
        return;
      }

      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    if (req.body?.method !== "initialize") {
      res.status(400).json({ error: "Initialize an MCP session first" });
      return;
    }

    const { server, transport } = createMcpSession();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP POST failed:", error);

    if (!res.headersSent) {
      res.status(500).json({ error: "MCP request failed" });
    }
  }
});

app.get("/mcp", async (req, res) => {
  try {
    const session = getSession(req, res);
    if (session) await session.transport.handleRequest(req, res);
  } catch (error) {
    console.error("MCP GET failed:", error);
    if (!res.headersSent) res.status(500).end();
  }
});

app.delete("/mcp", async (req, res) => {
  try {
    const session = getSession(req, res);
    if (session) await session.transport.handleRequest(req, res);
  } catch (error) {
    console.error("MCP DELETE failed:", error);
    if (!res.headersSent) res.status(500).end();
  }
});

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from the existing server/.env");
  }

  await mongoose.connect(uri);
  console.log("HomeFlow MongoDB connection established");

  app.listen(3001, () => {
    console.log("HomeFlow MCP server listening on http://localhost:3001/mcp");
  });
}

main().catch((error) => {
  console.error("Failed to start HomeFlow MCP server:", error);
  process.exit(1);
});
