"use strict";
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    requred: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    requred: true,
    trim: true,
    minLength: 3,
  }
}, { collation: "users" }); // Explicitly specify the collection name

module.exports = mongoose.model("User", userSchema);