"use strict";
const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
    trim: true,
  },
  completeBy: {
    type: Date,
    // default: Date.now,
    required: true,
  },
  completedAt: {
    type: Date,
    required: true,
  },
  isChecked: {
    type: Boolean,
    required: true,
    default: false,
  }
}, { collection: "schedules" }); // Explicitly specify the collection name

module.exports = mongoose.model("Schedule", scheduleSchema);