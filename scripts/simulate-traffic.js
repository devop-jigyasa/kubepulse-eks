/**
 * KubePulse Real-Time Load & Traffic Simulator
 * Simulates microservices traffic, health checks, and CRUD workloads
 * to populate Prometheus metrics and Grafana dashboards.
 */

const http = require("http");

const BASE_URL = process.env.API_URL || "http://localhost:5050";
const DURATION_SECONDS = parseInt(process.env.DURATION || "30", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "3", 10);

const SAMPLE_TASKS = [
  { task: "Deploy EKS managed node group v1.29", category: "Infrastructure", priority: "High" },
  { task: "Rotate AWS KMS customer managed keys", category: "Security", priority: "Critical" },
  { task: "Scale backend replica set to 5 pods", category: "Deployment", priority: "Medium" },
  { task: "Apply zero-trust network policies", category: "Security", priority: "High" },
  { task: "Configure Prometheus ServiceMonitor alerts", category: "Monitoring", priority: "Low" },
  { task: "Audit IAM IRSA service account bindings", category: "Security", priority: "Critical" },
  { task: "Run Trivy container vulnerability scan", category: "Deployment", priority: "Medium" },
];

let stats = {
  totalRequests: 0,
  successful: 0,
  failed: 0,
  latencies: [],
};

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const duration = Date.now() - startTime;
        stats.totalRequests++;
        stats.latencies.push(duration);

        if (res.statusCode >= 200 && res.statusCode < 400) {
          stats.successful++;
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body), duration });
          } catch {
            resolve({ status: res.statusCode, data: body, duration });
          }
        } else {
          stats.failed++;
          resolve({ status: res.statusCode, data: body, duration });
        }
      });
    });

    req.on("error", (err) => {
      stats.failed++;
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function simulateWorker(workerId, stopTime) {
  while (Date.now() < stopTime) {
    try {
      // 1. Health Probe
      await request("GET", "/healthz");
      await request("GET", "/readyz");

      // 2. Fetch Tasks
      const list = await request("GET", "/api/tasks");

      // 3. Create Task
      const sample = SAMPLE_TASKS[Math.floor(Math.random() * SAMPLE_TASKS.length)];
      const created = await request("POST", "/api/tasks", {
        ...sample,
        task: `${sample.task} [load-${Math.floor(Math.random() * 1000)}]`,
      });

      // 4. Toggle Task if created
      if (created.data && created.data._id) {
        await request("PUT", `/api/tasks/${created.data._id}`, { completed: true });
      }

      // 5. Occasionally trigger a 404 to test error rate metrics
      if (Math.random() < 0.15) {
        await request("GET", "/api/non-existent-endpoint");
      }

      // Small jitter between requests
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
    } catch (err) {
      // Container warming up
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

async function main() {
  console.log(`\n=====================================================`);
  console.log(`🚀 KubePulse Traffic & Metrics Load Simulator`);
  console.log(`Target:      ${BASE_URL}`);
  console.log(`Duration:    ${DURATION_SECONDS}s | Concurrency: ${CONCURRENCY} workers`);
  console.log(`=====================================================\n`);

  const stopTime = Date.now() + DURATION_SECONDS * 1000;
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(simulateWorker(i + 1, stopTime));
  }

  await Promise.all(workers);

  const avgLatency =
    stats.latencies.length > 0
      ? (stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(1)
      : 0;
  const p95Latency =
    stats.latencies.length > 0
      ? stats.latencies.sort((a, b) => a - b)[Math.floor(stats.latencies.length * 0.95)]
      : 0;

  console.log(`\n📊 Load Test Results:`);
  console.log(`Total Requests:  ${stats.totalRequests}`);
  console.log(`Successful:      ${stats.successful}`);
  console.log(`Errors (4xx/5xx):${stats.failed}`);
  console.log(`Avg Latency:     ${avgLatency} ms`);
  console.log(`P95 Latency:     ${p95Latency} ms`);
  console.log(`\nPrometheus metrics updated at ${BASE_URL}/metrics ✅\n`);
}

main();
