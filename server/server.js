require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/Task");


const app = express();
app.use(express.json());

let tasks = [];
let nextId = 1;


const port = 3000;



app.get("/api/health",(req,res) =>{
    res.json({
        status: "ok",
        message: "Lexa server is running",
        "app": "Lexa"
    });
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