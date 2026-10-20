
const Task = require("../models/Task");

async function listTasks() {
  return await Task.find().sort({ createdAt: -1 });
}

async function createTask(taskData) {
  return await Task.create(taskData);
}

module.exports = {
  listTasks,
  createTask,
};
