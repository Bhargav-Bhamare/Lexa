require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/Task");
const ShoppingItem = require("./models/ShoppingItem");
const Reminder = require("./models/Reminder");
const { listTasks } = require("./services/taskService");
const assistantRouter = require("./assistant");


const app = express();
app.use(express.json());
app.use("/api/assistant", assistantRouter);

const port = 3000;



app.get("/api/health",(req,res) =>{
    res.json({
        status: "ok",
        message: "Lexa server is running",
        "app": "Lexa"
    });
});

//Tasks API list

app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await listTasks();

    res.status(200).json({
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error("Failed to fetch tasks:", error.message);

    res.status(500).json({
      error: "Failed to fetch tasks"
    });
  }
});


app.get("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid task ID"
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found"
      });
    }

    res.status(200).json({
      task
    });
  } catch (error) {
    console.error("Failed to fetch task:", error.message);

    res.status(500).json({
      error: "Failed to fetch task"
    });
  }
});




app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, dueAt, priority } = req.body || {};

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        error: "Title is required and must be a non-empty string"
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      dueAt,
      priority
    });

    res.status(201).json({
      message: "Task created successfully",
      task
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error("Failed to create task:", error.message);

    res.status(500).json({
      error: "Failed to create task"
    });
  }
});


app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid task ID"
      });
    }

    const allowedFields = [
      "title",
      "description",
      "dueAt",
      "priority",
      "status"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body && req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "Provide at least one valid field to update"
      });
    }

    const task = await Task.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!task) {
      return res.status(404).json({
        error: "Task not found"
      });
    }

    res.status(200).json({
      message: "Task updated successfully",
      task
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error("Failed to update task:", error.message);

    res.status(500).json({
      error: "Failed to update task"
    });
  }
});


app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid task ID"
      });
    }

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found"
      });
    }

    res.status(200).json({
      message: "Task deleted successfully",
      task
    });
  } catch (error) {
    console.error("Failed to delete task:", error.message);

    res.status(500).json({
      error: "Failed to delete task"
    });
  }
});


//Shopping items api


app.post("/api/shopping", async (req, res) => {
  try {
    const { name, quantity } = req.body || {};

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: "Item name is required"
      });
    }

    const item = await ShoppingItem.create({
      name: name.trim(),
      quantity
    });

    res.status(201).json({
      message: "Shopping item added successfully",
      item
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error("Failed to add shopping item:", error.message);

    res.status(500).json({
      error: "Failed to add shopping item"
    });
  }
});


app.get("/api/shopping", async (req, res) => {
  try {
    const items = await ShoppingItem.find().sort({
      createdAt: -1
    });

    res.status(200).json({
      count: items.length,
      items
    });
  } catch (error) {
    console.error("Failed to fetch shopping items:", error.message);

    res.status(500).json({
      error: "Failed to fetch shopping items"
    });
  }
});



app.patch("/api/shopping/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid shopping item ID"
      });
    }

    const allowedFields = ["name", "quantity", "purchased"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body && req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "Provide at least one valid field to update"
      });
    }

    if (
      updates.name !== undefined &&
      (typeof updates.name !== "string" || !updates.name.trim())
    ) {
      return res.status(400).json({
        error: "Item name must be a non-empty string"
      });
    }

    const taskUpdates = { ...updates };

    if (typeof taskUpdates.name === "string") {
      taskUpdates.name = taskUpdates.name.trim();
    }

    const item = await ShoppingItem.findByIdAndUpdate(
      id,
      taskUpdates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!item) {
      return res.status(404).json({
        error: "Shopping item not found"
      });
    }

    res.status(200).json({
      message: "Shopping item updated successfully",
      item
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error("Failed to update shopping item:", error.message);

    res.status(500).json({
      error: "Failed to update shopping item"
    });
  }
});


app.delete("/api/shopping/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid shopping item ID"
      });
    }

    const item = await ShoppingItem.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({
        error: "Shopping item not found"
      });
    }

    res.status(200).json({
      message: "Shopping item deleted successfully",
      item
    });
  } catch (error) {
    console.error("Failed to delete shopping item:", error.message);

    res.status(500).json({
      error: "Failed to delete shopping item"
    });
  }
});

//API for Reminders


app.post("/api/reminders", async (req, res) => {
  try {
    const { title, remindAt } = req.body || {};

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: "Reminder title is required"
      });
    }

    if (!remindAt) {
      return res.status(400).json({
        error: "Reminder date and time are required"
      });
    }

    const reminder = await Reminder.create({
      title: title.trim(),
      remindAt
    });

    res.status(201).json({
      message: "Reminder created successfully",
      reminder
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error("Failed to create reminder:", error.message);

    res.status(500).json({
      error: "Failed to create reminder"
    });
  }
});



app.get("/api/reminders", async (req, res) => {
  try {
    const reminders = await Reminder.find().sort({
      remindAt: 1
    });

    res.status(200).json({
      count: reminders.length,
      reminders
    });
  } catch (error) {
    console.error("Failed to fetch reminders:", error.message);

    res.status(500).json({
      error: "Failed to fetch reminders"
    });
  }
});



app.patch("/api/reminders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid reminder ID"
      });
    }

    const allowedFields = ["title", "remindAt", "completed"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body && req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "Provide at least one valid field to update"
      });
    }

    if (
      updates.title !== undefined &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        error: "Reminder title must be a non-empty string"
      });
    }

    if (
      updates.completed !== undefined &&
      typeof updates.completed !== "boolean"
    ) {
      return res.status(400).json({
        error: "Completed must be true or false"
      });
    }

    if (typeof updates.title === "string") {
      updates.title = updates.title.trim();
    }

    const reminder = await Reminder.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!reminder) {
      return res.status(404).json({
        error: "Reminder not found"
      });
    }

    res.status(200).json({
      message: "Reminder updated successfully",
      reminder
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        error: error.message
      });
    }

    console.error("Failed to update reminder:", error.message);

    res.status(500).json({
      error: "Failed to update reminder"
    });
  }
});


app.delete("/api/reminders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid reminder ID"
      });
    }

    const reminder = await Reminder.findByIdAndDelete(id);

    if (!reminder) {
      return res.status(404).json({
        error: "Reminder not found"
      });
    }

    res.status(200).json({
      message: "Reminder deleted successfully",
      reminder
    });
  } catch (error) {
    console.error("Failed to delete reminder:", error.message);

    res.status(500).json({
      error: "Failed to delete reminder"
    });
  }
});





async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(uri);

    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

connectDB();

app.listen(port, ()=>{
    console.log("Lexa is running sucessfully at Port 3000!")
})