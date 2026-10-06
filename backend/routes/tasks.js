const express = require("express");
const router = express.Router();
const Task = require("../models/task");

// Create Task
router.post("/", async (req, res) => {
  try {
    const task = await new Task(req.body).save();
    res.status(201).send(task);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Get All Tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).send(tasks);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Update Task
router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id }, req.body, {
      new: true,
    });
    res.status(200).send(task);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

// Delete Task
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    res.status(200).send(task);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

module.exports = router;
