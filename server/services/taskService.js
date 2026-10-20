const Task = require("../models/Task");

async function listTasks() {
  return await Task.find().sort({ createdAt: -1 });
}

module.exports = { listTasks };