require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectWithRetry = require("./db");
const tasks = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 8080;
const START_TIME = Date.now();

// Simple in-memory metrics counter
let requestCount = 0;
let errorCount = 0;

// Connect to Database
connectWithRetry();

// Core Middleware
app.use(express.json());
app.use(cors());

// Structured JSON Request Logger
app.use((req, res, next) => {
  requestCount++;
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) errorCount++;

    // Don't clutter logs with probe spam
    if (req.path === "/healthz" || req.path === "/readyz" || req.path === "/metrics") {
      return;
    }

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? "error" : "info",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        clientIp: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      })
    );
  });
  next();
});

// ==========================================
// Kubernetes Health & Observability Probes
// ==========================================

// Liveness Probe: confirms the application process is running
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Readiness Probe: confirms the application is ready to accept user traffic
app.get("/readyz", (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (isDbReady) {
    return res.status(200).json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(503).json({
      status: "unready",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Prometheus Metrics Endpoint
app.get("/metrics", (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  const metrics = `
# HELP kubepulse_http_requests_total Total HTTP requests received
# TYPE kubepulse_http_requests_total counter
kubepulse_http_requests_total ${requestCount}

# HELP kubepulse_http_errors_total Total HTTP error responses (4xx & 5xx)
# TYPE kubepulse_http_errors_total counter
kubepulse_http_errors_total ${errorCount}

# HELP kubepulse_process_uptime_seconds Application uptime in seconds
# TYPE kubepulse_process_uptime_seconds gauge
kubepulse_process_uptime_seconds ${uptime}

# HELP kubepulse_memory_rss_bytes Resident Set Size in bytes
# TYPE kubepulse_memory_rss_bytes gauge
kubepulse_memory_rss_bytes ${memUsage.rss}

# HELP kubepulse_database_status Database connection status (1 = connected, 0 = disconnected)
# TYPE kubepulse_database_status gauge
kubepulse_database_status ${mongoose.connection.readyState === 1 ? 1 : 0}
`.trim();

  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(metrics);
});

// Application Business Routes
app.use("/api/tasks", tasks);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    })
  );
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      message: `KubePulse API listening on port ${PORT}`,
      environment: process.env.NODE_ENV || "development",
    })
  );
});

// Graceful Shutdown for Kubernetes SIGTERM / SIGINT
const gracefulShutdown = (signal) => {
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      message: `Received ${signal}. Initiating graceful shutdown...`,
    })
  );

  server.close(async () => {
    console.log(
      JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        message: "HTTP server closed. Draining database connections...",
      })
    );
    try {
      await mongoose.connection.close(false);
      console.log(
        JSON.stringify({
          level: "info",
          timestamp: new Date().toISOString(),
          message: "Database connections cleanly terminated. Process exit.",
        })
      );
      process.exit(0);
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          timestamp: new Date().toISOString(),
          message: `Error closing database: ${err.message}`,
        })
      );
      process.exit(1);
    }
  });

  // Force exit after 10s if connections refuse to close
  setTimeout(() => {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        message: "Forced shutdown due to timeout",
      })
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
