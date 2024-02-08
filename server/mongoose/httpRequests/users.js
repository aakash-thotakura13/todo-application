"use strict";
const express = require("express");
const router = express.Router();

const Users = require("../models/user");


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
      const findUser = await Users.findOne({ userName: req.body.userName, password: req.body.password });
      res.status(200).send(findUser);
    } catch (err) {
      res.status(404).send(`Error while fetching task \n ${err}`);
    }
  })


// SORTING METHODS
router
  .route(`/todos/:id`)
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
  .delete(async (req, res) => {
    try {
      await Users.
        findByIdAndDelete(req.params.id)
        .then(response => res.status(200).send("Deleted Successfully", response))
        .catch(err => res.status(404).send("User not found for deletion \n ", err));
    } catch (error) {
      res.status(500).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route(`/todos/date/:id`)
  .get(async (req, res) => {
    try {
      await Users
        .findById(req.params.id)
        .populate({
          path: "todos",
          options: { sort: { completeBy: 1 } }
        })
        .then(user => res.status(200).send(user))
        .catch(err => res.status(404).send(err));
    } catch (error) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route(`/todos/done/:id`)
  .get(async (req, res) => {
    try {
      await Users
        .findById(req.params.id)
        .populate({
          path: "todos",
          options: { sort: { isChecked: 1 } }
        })
        .then(user => res.status(200).send(user))
        .catch(err => res.status(404).send(err));
    } catch (error) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route(`/schedules/:id`)
  .get(async (req, res) => {
    try {
      await Users
        .findById(req.params.id)
        .populate({ path: "schedules" })
        .then(user => res.status(200).send(user))
        .catch(err => res.status(404).send(err));

    } catch (err) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route(`/schedules/date/:id`)
  .get(async (req, res) => {
    try {
      await Users
        .findById(req.params.id)
        .populate({
          path: "schedules",
          options: { sort: { completeBy: 1 } }
        })
        .then(user => res.status(200).send(user))
        .catch(err => res.status(404).send(err));
    } catch (error) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })

router
  .route(`/schedules/done/:id`)
  .get(async (req, res) => {
    try {
      await Users
        .findById(req.params.id)
        .populate({
          path: "schedules",
          options: { sort: { isChecked: 1 } }
        })
        .then(user => res.status(200).send(user))
        .catch(err => res.status(404).send(err));
    } catch (error) {
      res.status(404).send(`Error while fetching tasks \n ${err}`);
    }
  })


module.exports = router