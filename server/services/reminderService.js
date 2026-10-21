
const Reminder = require("../models/Reminder");

async function listReminders() {
  return await Reminder.find().sort({ remindAt: 1 });
}

async function createReminder(reminderData) {
  return await Reminder.create(reminderData);
}

async function updateReminder(reminderId, updates) {
  return await Reminder.findByIdAndUpdate(
    reminderId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  );
}

async function deleteReminder(reminderId) {
  return await Reminder.findByIdAndDelete(reminderId);
}

module.exports = {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
};
