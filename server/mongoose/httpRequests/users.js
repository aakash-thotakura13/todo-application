"use strict";
const express = require("express");
const router = express.Router();

const Users = require("../models/user");
const todo = require("../models/todo");


router
  .route("/")
  .get(async (req, res) => {
    try {
      const tasks = await Users.find();
      res.status(200).send(tasks);
    } catch (err) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route(`/:id`)
  .get(async (req, res) => {
    try {

      await Users
        .findById(req.params.id)
        .populate({ path: "todos" })
        .then(user => res.status(200).send(user))
        .catch(err => res.status(404).send(err));

    } catch (err) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route("/signup")
  .post(async (req, res) => {
    try {
      const documentCreated = await Users.create(req.body);
      res.status(200).send(documentCreated);
    } catch (err) {
      res.status(404).send(err);
    }
  })

router
  .route("/login")
  .post(async (req, res) => {
    try {
      const findUser = await Users.findOne({ userName: req.body.userName, password: req.body.password }).collation({ locale: 'en', });
      res.status(200).send(findUser);
    } catch (err) {
      res.status(404).send(`Error while fetching task \n ${err}`);
    }
  })


module.exports = router