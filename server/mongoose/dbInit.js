"use strict";
const mongoose = require("mongoose");

const uri = `mongodb+srv://aakashthotakura:${process.env.MONGOOSE_PASSWORD}@cluster0.jnhmrwc.mongodb.net/daily-planner?retryWrites=true&w=majority`;

async function dbInit() {
  try {
    await mongoose.connect(uri)
    console.log("Database Connection to Backend Server")
  } catch (error) {
    console.log("Database Connection Error", error)
  }
}

module.exports = dbInit;