"use strict";
const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
    trim: true,
  },
  completeBy: {
    type: Date,
    default: Date.now,
    required: true,
  },
  isChecked: {
    type: Boolean,
    required: true,
    default: false,
  }
});

module.exports = mongoose.model("Todo", todoSchema);