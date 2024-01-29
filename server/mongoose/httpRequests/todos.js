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
      const postReq = await Todos.create(req.body);
      res.status(200).send(postReq);
    } catch (error) {
      res.status(400).send(error);
    }
  })

router
  .route(`/:id`)
  .patch((req, res) => {
    Todos
      .updateOne({ _id: req.params.id }, req.body)
      .then((todo) => res.status(200).send("todo updated", todo))
      .catch(err => res.status(404).send(`Error while updating todos ${err}`));
  })
  .delete((req, res) => {
    Todos
      .deleteOne({ _id: req.params.id })
      .then((todo) => res.status(200).send("todo deleted", todo))
      .catch(err => res.status(404).send(`Error while deleting todos ${err}`));
  })


module.exports = router;