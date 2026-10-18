
require("dotenv").config();

const mongoose = require("mongoose");
const Task = require("./models/Task");

async function testTaskModel() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    const validTask = new Task({
      title: "Clean the living room",
      description: "Prepare for guests",
      dueAt: "2026-10-20T18:00:00.000Z",
      priority: "high"
    });

    await validTask.validate();
    console.log("Valid task passed validation");

    const invalidTask = new Task({
      title: "   ",
      priority: "urgent"
    });

    try {
      await invalidTask.validate();
      console.log("Unexpected: invalid task passed");
    } catch (error) {
      console.log("Invalid task rejected correctly");
      console.log(Object.keys(error.errors));
    }
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testTaskModel();
