require("dotenv").config();

const express = require("express");

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

app.post("/api/tasks",(req,res) => {
    const {title, description, dueDate, priority} = req.body;
    if(!title || typeof title != "string" || !title.trim()){
        return res.status(400).json({
            error: "Title is required and must be a non-empty string"
        });
    }

    const task = {
        id: nextId++,
        title: title.trim(),
        description: description || "",
        dueDate: dueDate || null,
        priority: priority || "medium",
        status: "pending",
        createdAt: new Date().toISOString()
    };

    tasks.push(task);

    res.status(201).json({
        message: "Task created Successfully",
        task: task
    });
});


const mongoose = require("mongoose");

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