
const Task = require("../models/Task");

async function listTasks() {
  return await Task.find().sort({ createdAt: -1 });
}

async function createTask(taskData) {
  return await Task.create(taskData);
}

async function updateTask(taskId, updates) {
  return await Task.findByIdAndUpdate(
    taskId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  );
}

module.exports = {
  listTasks,
  createTask,
  updateTask,
};
