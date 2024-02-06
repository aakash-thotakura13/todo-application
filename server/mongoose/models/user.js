"use strict";
const { mongoose, Schema } = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    unique: true,
  },
  todos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Todo", }],
  schedules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Schedule", }],
}, { collection: "users" }); // Explicitly specify the collection name

module.exports = mongoose.model("User", userSchema);