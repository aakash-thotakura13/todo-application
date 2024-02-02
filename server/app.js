"use strict";
require('dotenv').config();
const express = require("express");
const cors = require("cors")
const dbInit = require('./mongoose/dbInit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Initiating Mongodb Database:
dbInit();

app.use("/schedules", require("./mongoose/httpRequests/schedules"));
app.use("/todos", require("./mongoose/httpRequests/todos"));
app.use("/users", require("./mongoose/httpRequests/users"));

app.get("/", (req, res) => {
  res.json({ message: "server is running!" });
})

app.get("*", (req, res) => {
  res.send(`<div><h1>404</h1><p>page not found</p></div>`);
})

app.listen(PORT, () => {
  console.log(`Server Listening at PORT ${PORT}`);
})
