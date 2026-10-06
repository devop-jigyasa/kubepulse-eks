require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connection = require("./db");
const tasks = require("./routes/tasks");

const app = express();

// Initialize DB connection
connection();

// Middleware
app.use(express.json());
app.use(cors());

// Basic status check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Routes
app.use("/api/tasks", tasks);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`[KubePulse API] Server running on port ${port}`);
});
