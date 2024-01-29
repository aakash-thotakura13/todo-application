"use strict";
require('dotenv').config();
const cors = require("cors")
const express = require("express");
const dbInit = require('./mongoose/dbInit');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// initiating database
dbInit();

app.use("/todos", require("./mongoose/httpRequests/todos"));

app.get("/", (req, res) => {
  res.json({ message: "server is running!" });
})

app.get("*", (req, res) => {
  res.send(`<div><h1>404</h1><p>page not found</p></div>`);
})

app.listen(PORT, () => {
  console.log(`Server Listening at PORT ${PORT}`);
})
