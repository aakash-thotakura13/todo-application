
const mongoose = require("mongoose");

const dailyTasksSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
    trim: true,
  }
}, { collection: "dailyTasks" });

module.exports = mongoose.model("DailyTask", dailyTasksSchema);