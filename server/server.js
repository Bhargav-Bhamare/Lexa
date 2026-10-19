require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/Task");


const app = express();
app.use(express.json());


const port = 3000;



app.get("/api/health",(req,res) =>{
    res.json({
        status: "ok",
        message: "Lexa server is running",
        "app": "Lexa"
    });
});


app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });

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