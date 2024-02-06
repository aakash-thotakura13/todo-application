"use strict";
const express = require("express");
const router = express.Router();
const { default: mongoose } = require("mongoose");

const Todos = require("../models/todo");
const Users = require("../models/user");

router
  .route("/")
  .get(async (req, res) => {
    try {
      const tasks = await Todos.find();
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  })
  .post(async (req, res) => {
    try {
      const documentCreated = await Todos.create(req.body);
      let ObjId = new mongoose.Types.ObjectId(documentCreated.id);

      const updatedUser = await Users.findOneAndUpdate(
        { _id: req.body.user },
        { $push: { todos: ObjId } },
      );

      res.status(200).send({ message: "Task ADDED SUCCESSFULLY", updatedUser });
    } catch (err) {
      res.status(404).send(err);
    }
  });


router
  .route("/date")
  .get(async (req, res) => {
    try {
      const tasks = await Todos.find().sort({ completeBy: 1, });
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  });


router
  .route("/done")
  .get(async (req, res) => {
    try {
      const tasks = await Todos.find().sort({ isChecked: 1, });
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  });


router
  .route("/done/date" || "/date/done")
  .get(async (req, res) => {
    try {
      const tasks = await Todos.find().sort({ isChecked: 1, completeBy: 1 });
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  });


router
  .route("/:id")
  .get(async (req, res) => {
    try {
      const result = await Todos.findById(req.params.id);
      res.status(200).send(result);
    } catch (err) {
      res.status(404).send(err);
    }
  })
  .put(async (req, res) => {
    try {
      const result = await Todos.findByIdAndUpdate(req.params.id, { $set: req.body });
      res.status(200).send(result);
    } catch (err) {
      res.status(404).send(err);
    }
  })
  .delete(async (req, res) => {
    try {
      const updateUser = await Users.findByIdAndUpdate(
        { _id: req.body.user_id },
        { $pull: { 'todos': req.body.id } },
      );
      const result = await Todos.findByIdAndDelete(req.params.id);
      res.status(200).json({ updateUser, result });
    } catch (err) {
      res.status(404).send(err);
    }
  });


module.exports = router;