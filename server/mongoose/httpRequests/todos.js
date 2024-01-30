"use strict";
const express = require("express");
const router = express.Router();

const Todos = require("../../mongoose/schemas/todo");

router
  .route("/")
  .get(async (req, res) => {
    await Todos
      .find()
      .then((todos) => res.status(200).send(todos))
      .catch(err => res.status(404).send(`Error while fetching todos ${err}`));
  })
  .post(async (req, res) => {
    try {
      const documentCreated = await Todos.create(req.body);
      res.status(200).send(documentCreated);
    } catch (error) {
      res.status(400).send(error);
    }
  })

router
  .route(`/:id`)
  .put(async (req, res) => {
    try {
      await Todos
        .findByIdAndUpdate(req.params.id, { $set: req.body })
        .then(result => res.status(200).send(result))
        .catch(err => res.status(404).send(err));
    } catch (error) {
      res.status(400).send(error);
    }
  })
  .delete(async (req, res) => {
    try {
      await Todos
        .findByIdAndDelete(req.params.id)
        .then(result => res.status(200).send(result))
        .catch(err => res.status(404).send(err));
    } catch (error) {
      res.status(400).send(error);
    }
  })


module.exports = router;