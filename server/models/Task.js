
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Task title cannot be empty"],
      maxlength: [150, "Task title cannot exceed 150 characters"]
    },

    description: {
      type: String,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },

    dueAt: {
      type: Date,
      default: null,
      validate: {
        validator: value =>
          value === null || !Number.isNaN(value.getTime()),
        message: "Please provide a valid due date"
      }
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending"
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports = mongoose.model("Task", taskSchema);
