"use strict";
const { mongoose } = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    lowercase: true,
    required: [true, "Please provide your User Name"],
    trim: true,
    unique: [true, "Username already exists"]
  },
  password: {
    type: String,
    minlength: 5,
    required: [true, "Please provide your password"],
    trim: true,
    unique: true,
  },
  todos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Todo", }],
  schedules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Schedule", }],
}, { collection: "users" }); // Explicitly specify the collection name

module.exports = mongoose.model("User", userSchema);