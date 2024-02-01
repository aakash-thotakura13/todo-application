"use strict";
const express = require("express");
const router = express.Router();

const Schedules = require("../schemas/schedule");

router
  .route("/")
  .get(async (req, res) => {
    try {
      const tasks = await Schedules.find();
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  })
  .post(async (req, res) => {
    try {
      const documentCreated = await Schedules.create(req.body);
      res.status(200).send(documentCreated);
    } catch (err) {
      res.status(400).send(err);
    }
  });

router
  .route("/date")
  .get(async (req, res) => {
    try {
      const tasks = await Schedules.find().sort({ completeBy: 1, });
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  });


router
  .route("/done")
  .get(async (req, res) => {
    try {
      const tasks = await Schedules.find().sort({ isChecked: 1, });
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  });


router
  .route("/done/date" || "/date/done")
  .get(async (req, res) => {
    try {
      const tasks = await Schedules.find().sort({ isChecked: 1, completeBy: 1 });
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks ${err}`);
    }
  });


router
  .route("/:id")
  .get(async (req, res) => {
    try {
      const result = await Schedules.findById(req.params.id);
      res.status(200).send(result);
    } catch (err) {
      res.status(400).send(err);
    }
  })
  .put(async (req, res) => {
    try {
      const result = await Schedules.findByIdAndUpdate(req.params.id, { $set: req.body });
      res.status(200).send(result);
    } catch (err) {
      res.status(400).send(err);
    }
  })
  .delete(async (req, res) => {
    try {
      const result = await Schedules.findByIdAndDelete(req.params.id);
      res.status(200).send(result);
    } catch (err) {
      res.status(400).send(err);
    }
  });

module.exports = router;