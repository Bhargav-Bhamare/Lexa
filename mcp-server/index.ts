
import express,{type Request, type Response } from "express";
import dotenv from "dotenv";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {randomUUID } from "node:crypto";
import { z } from "zod";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";

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

//Import Task Service
const { listTasks, createTask, updateTask, deleteTask } = backendRequire(
  "./services/taskService"
) as {
  listTasks: () => Promise<unknown[]>;
  createTask: (taskData: {
    title: string;
    description?: string;
    dueAt?: string | null;
    priority?: "low" | "medium" | "high";
    status?: "pending" | "in_progress" | "completed";
  }) => Promise<unknown>;
  updateTask: (
    taskId: string,
    updates: Record<string, unknown>
  ) => Promise<unknown | null>;
  deleteTask: (taskId: string) => Promise<unknown | null>;
};

//Import ShoppingItem Service
  const {
    listShoppingItems,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
  } = backendRequire("./services/shoppingItemService") as {
    listShoppingItems: () => Promise<unknown[]>;
    createShoppingItem: (itemData: {
      name: string;
      quantity?: number;
      purchased?: boolean;
    }) => Promise<unknown>;
    updateShoppingItem: (
      itemId: string,
      updates: {
        name?: string;
        quantity?: number;
        purchased?: boolean;
      }
    ) => Promise<unknown>;
    deleteShoppingItem: (itemId: string) => Promise<unknown>;
  };

  //Import Reminder Service
  const {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  } = backendRequire("./services/reminderService") as {
    listReminders: () => Promise<unknown[]>;
    createReminder: (reminderData: {
      title: string;
      remindAt: string | Date;
      completed?: boolean;
    }) => Promise<unknown>;
    updateReminder: (
      reminderId: string,
      updates: {
        title?: string;
        remindAt?: string | Date;
        completed?: boolean;
      }
    ) => Promise<unknown>;
    deleteReminder: (reminderId: string) => Promise<unknown>;
  };


const app = express();
app.use(express.json());

type McpSession = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

const sessions = new Map<string, McpSession>();

function createMcpSession(): McpSession{
  const server = new McpServer({
    name: "lexa-mcp",
    version: "1.0.0",
  });

  // Register our first real Lexa tool.
  server.registerTool(
    "list_tasks",
    {
      title: "List Lexa tasks",
      description: "Retrieve all tasks saved in Lexa, newest first.",
      inputSchema: {},
    },
    async () => {
      try {
        const tasks = await listTasks();

        return{
          content: [
            {
              type: "text",
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }catch (error) {
        console.error("list_tasks failed:", error);

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Failed to retrieve Lexa tasks. Check the server logs.",
            },
          ],
        };
      }
    }
  );

  
  server.registerTool(
    "create_task",
    {
      title: "Create a HomeFlow task",
      description:
        "Create and save a task in HomeFlow. Provide a title and optionally a description, due date, priority, and status.",
      inputSchema: {
        title: z.string().trim().min(1).max(150),
        description: z.string().max(1000).optional(),
        dueAt: z.string().datetime().nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z
          .enum(["pending", "in_progress", "completed"])
          .optional(),
      },
    },
    async ({ title, description, dueAt, priority, status }) => {
      try {
        const task = await createTask({
          title,
          description,
          dueAt: dueAt ?? null,
          priority,
          status,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error("create_task failed:", error);

        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? `Could not create task: ${error.message}`
                  : "Could not create task.",
            },
          ],
        };
      }
    }
  );

  
      server.registerTool(
        "update_task",
        {
          title: "Update a Lexa task",
          description:
            "Update selected fields of an existing Lexa task using its MongoDB task ID.",
          inputSchema: {
            taskId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid task ID"),
            title: z.string().trim().min(1).max(150).optional(),
            description: z.string().max(1000).optional(),
            dueAt: z.string().datetime().nullable().optional(),
            priority: z.enum(["low", "medium", "high"]).optional(),
            status: z
              .enum(["pending", "in_progress", "completed"])
              .optional(),
          },
        },
        async ({ taskId, title, description, dueAt, priority, status }) => {
          try {
            const updates: Record<string, unknown> = {};

            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (dueAt !== undefined) updates.dueAt = dueAt;
            if (priority !== undefined) updates.priority = priority;
            if (status !== undefined) updates.status = status;

            if (Object.keys(updates).length === 0) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: "Provide at least one field to update.",
                  },
                ],
              };
            }

      const updatedTask = await updateTask(taskId, updates);

      if (!updatedTask) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Task not found.",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(updatedTask, null, 2),
          },
        ],
      };
      }catch(error) {
        console.error("update_task failed:", error);

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Could not update task. Check the input and server logs.",
            },
          ],
        };
        }
        }
      );

          
      server.registerTool(
      "delete_task",
      {
        title: "Delete a Lexa task",
        description:
          "Delete an existing Lexa task using its MongoDB task ID.",
        inputSchema: {
          taskId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid task ID"),
        },
      },
      async ({ taskId }) => {
        try {
          const deletedTask = await deleteTask(taskId);

          if (!deletedTask) {
            return {
              isError: true,
              content: [{ type: "text", text: "Task not found." }],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(deletedTask, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("delete_task failed:", error);

          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Could not delete task. Check the server logs.",
                  },
                  ],
                };
              }
            }
          );

          
          server.registerTool(
            "list_shopping_items",
            {
              title: "List Lexa shopping items",
              description:
                "Retrieve all shopping items saved in Lexa, newest first.",
              inputSchema: {},
            },
            async () => {
              try {
                const items = await listShoppingItems();

                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(items, null, 2),
                    },
                  ],
                };
              } catch (error) {
                console.error("list_shopping_items failed:", error);

                return {
                  isError: true,
                  content: [
                    {
                      type: "text",
                      text: "Could not retrieve shopping items. Check the server logs.",
                    },
                  ],
                };
              }
            }
          );

          
          server.registerTool(
            "add_shopping_item",
            {
              title: "Add a Lexa shopping item",
              description:
                "Add an item to Lexa's shopping list with an optional quantity.",
              inputSchema: {
                name: z.string().trim().min(1).max(100),
                quantity: z.number().int().min(1).optional(),
              },
            },
            async ({ name, quantity }) => {
              try {
                const item = await createShoppingItem({
                  name,
                  quantity,
                });

                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(item, null, 2),
                    },
                  ],
                };
              } catch (error) {
                console.error("add_shopping_item failed:", error);

                return {
                  isError: true,
                  content: [
                    {
                      type: "text",
                      text: "Could not add shopping item. Check the server logs.",
                    },
                  ],
                };
              }
            }
          );

          
          server.registerTool(
            "update_shopping_item",
            {
              title: "Update a Lexa shopping item",
              description:
                "Update the name, quantity, or purchased status of an existing shopping item using its MongoDB ID.",
              inputSchema: {
                itemId: z.string().regex(/^[a-fA-F0-9]{24}$/),
                name: z.string().trim().min(1).max(100).optional(),
                quantity: z.number().int().min(1).optional(),
                purchased: z.boolean().optional(),
              },
            },
            async ({ itemId, name, quantity, purchased }) => {
              try {
                const updates: {
                  name?: string;
                  quantity?: number;
                  purchased?: boolean;
                } = {};

                if (name !== undefined) updates.name = name;
                if (quantity !== undefined) updates.quantity = quantity;
                if (purchased !== undefined) updates.purchased = purchased;

                if (Object.keys(updates).length === 0) {
                  return {
                    isError: true,
                    content: [
                      {
                        type: "text",
                        text: "Provide at least one field to update.",
                      },
                    ],
                  };
                }

                const item = await updateShoppingItem(itemId, updates);

                if (!item) {
                  return {
                    isError: true,
                    content: [
                      {
                        type: "text",
                        text: "Shopping item not found.",
                      },
                    ],
                  };
                }

                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(item, null, 2),
                    },
                  ],
                };
              } catch (error) {
                console.error("update_shopping_item failed:", error);
                return {
                  isError: true,
                  content: [
                    {
                      type: "text",
                      text: "Could not update shopping item. Check the server logs.",
                    },
                  ],
                };
              }
            }
          );

          
          server.registerTool(
            "delete_shopping_item",
            {
              title: "Delete a Lexa shopping item",
              description:
                "Delete an existing shopping item using its MongoDB ID.",
              inputSchema: {
                itemId: z.string().regex(/^[a-fA-F0-9]{24}$/),
              },
            },
            async ({ itemId }) => {
              try {
                const item = await deleteShoppingItem(itemId);

                if (!item) {
                  return {
                    isError: true,
                    content: [
                      {
                        type: "text",
                        text: "Shopping item not found.",
                      },
                    ],
                  };
                }

                return {
                  content: [
                    {
                      type: "text",
                      text: `Shopping item deleted successfully.`,
                    },
                  ],
                };
              } catch (error) {
                console.error("delete_shopping_item failed:", error);
                return {
                  isError: true,
                  content: [
                    {
                      type: "text",
                      text: "Could not delete shopping item. Check the server logs.",
                    },
                  ],
                };
              }
            }
          );

          
      // 1. List reminders
      server.registerTool(
        "list_reminders",
        {
          title: "List Lexa reminders",
          description:
            "Retrieve all reminders saved in Lexa, ordered by reminder date and time.",
          inputSchema: {},
        },
        async () => {
          try {
            const reminders = await listReminders();

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(reminders, null, 2),
                },
              ],
            };
          } catch (error) {
            console.error("list_reminders failed:", error);

            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: "Could not retrieve reminders. Check the server logs.",
                },
              ],
            };
          }
        }
      );

      // 2. Create a reminder
      server.registerTool(
        "create_reminder",
        {
          title: "Create a Lexa reminder",
          description:
            "Create a reminder with a title and reminder date/time. Provide the date/time as an ISO 8601 string ending in Z, for example 2026-10-22T09:00:00.000Z.",
          inputSchema: {
            title: z.string().trim().min(1).max(150),
            remindAt: z.string().datetime(),
          },
        },
        async ({ title, remindAt }) => {
          try {
            const reminder = await createReminder({
              title,
              remindAt: new Date(remindAt),
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(reminder, null, 2),
                },
              ],
            };
          } catch (error) {
            console.error("create_reminder failed:", error);

            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text:
                    error instanceof Error
                      ? `Could not create reminder: ${error.message}`
                      : "Could not create reminder.",
                },
              ],
            };
          }
        }
      );

      // 3. Update a reminder
      server.registerTool(
        "update_reminder",
        {
          title: "Update a Lexa reminder",
          description:
            "Update the title, reminder date/time, or completed status of an existing reminder using its MongoDB ID.",
          inputSchema: {
            reminderId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid reminder ID"),
            title: z.string().trim().min(1).max(150).optional(),
            remindAt: z.string().datetime().optional(),
            completed: z.boolean().optional(),
          },
        },
        async ({ reminderId, title, remindAt, completed }) => {
          try {
            const updates: {
              title?: string;
              remindAt?: Date;
              completed?: boolean;
            } = {};

            if (title !== undefined) updates.title = title;
            if (remindAt !== undefined) updates.remindAt = new Date(remindAt);
            if (completed !== undefined) updates.completed = completed;

            if (Object.keys(updates).length === 0) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: "Provide at least one field to update.",
                  },
                ],
              };
            }

            const reminder = await updateReminder(reminderId, updates);

            if (!reminder) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: "Reminder not found.",
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(reminder, null, 2),
                },
              ],
            };
          } catch (error) {
            console.error("update_reminder failed:", error);

            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: "Could not update reminder. Check the input and server logs.",
                },
              ],
            };
          }
        }
      );

      // 4. Delete a reminder
      server.registerTool(
        "delete_reminder",
        {
          title: "Delete a Lexa reminder",
          description:
            "Delete an existing reminder using its MongoDB reminder ID.",
          inputSchema: {
            reminderId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid reminder ID"),
          },
        },
        async ({ reminderId }) => {
          try {
            const reminder = await deleteReminder(reminderId);

            if (!reminder) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: "Reminder not found.",
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: "text",
                  text: "Reminder deleted successfully.",
                },
              ],
            };
          } catch (error) {
            console.error("delete_reminder failed:", error);

            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: "Could not delete reminder. Check the server logs.",
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
  console.log("Lexa MongoDB connection established");

  app.listen(3001, () => {
    console.log("Lexa MCP server listening on http://localhost:3001/mcp");
  });
}

main().catch((error) => {
  console.error("Failed to start Lexa MCP server:", error);
  process.exit(1);
});
