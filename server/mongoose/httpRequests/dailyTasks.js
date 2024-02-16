"use strict";
const express = require("express");
const router = require("express").Router();
const { default: mongoose } = require("mongoose");

const DailyTasks = require("../models/dailyTask")
const Users = require("../models/user");

router
  .route("/")
  .get(async (req, res) => {
    try {
      const tasks = await DailyTasks.find();
      res.status(200).send(tasks);
    } catch (error) {
      res.status(404).send("Error Fetching Data!", error)
    }
  })
  .post(async (req, res) => {
    try {
      const documentCreated = await DailyTasks.create(req.body);
      const objId = new mongoose.Types.ObjectId(documentCreated.id);

      const updateUser = await Users.findOneAndUpdate(
        { _id: req.body.user },
        { $push: { dailyTasks: objId }, },
      )
      res.status(200).send({ message: "Task ADDED SUCCESSFULLY", updateUser });
    } catch (error) {
      res.status(404).send("Error Posting Data!", error)
    }
  });

router
  .route("/:id")
  .get(async (req, res) => {
    try {
      const result = await DailyTasks.findById(req.params.id);
      res.status(200).send(result);
    } catch (error) {
      res.status(404).send("Error Fetching Data!", error)
    }
  })
  .put(async (req, res) => {
    try {
      const result = await DailyTasks.findByIdAndUpdate(req.params.id, { $set: req.body });
      res.status(200).send(result);
    } catch (error) {
      res.status(404).send("Error Updating Data!", error)
    }
  })
  .delete(async (req, res) => {
    try {
      const updateUser = await Users.findByIdAndUpdate(
        { _id: req.body.user_id },
        { $pull: { 'dailyTasks': req.body.id } },
      )
      const result = await DailyTasks.findByIdAndDelete(req.params.id);
      res.status(200).json({ updateUser, result });
    } catch (error) {
      res.status(404).send("Error Deleting Task!", error)
    }
  })

module.exports = router;