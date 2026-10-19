
const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required:[true, "Reminder title is required"],
      trim: true,
      minlength:[1, "Reminder title cannot be empty"],
      maxlength:[150, "Reminder title cannot exceed 150 characters"]
    },

    remindAt: {
      type: Date,
      required:[true, "Reminder date and time are required"]
    },

    completed:{
      type: Boolean,
      default:false
    }
  },
  {
    timestamps:true
  }
);

module.exports = mongoose.model("Reminder", reminderSchema);
