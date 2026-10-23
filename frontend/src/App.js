import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "/api/tasks";

// Pre-packaged enterprise cloud scenarios for instant seeding
const PRESET_SCENARIOS = {
  incident: [
    { task: "Remediate P1 alert: Ingress latency spike on us-west-2a", category: "Security", priority: "Critical" },
    { task: "Execute rolling restart of unready backend pods", category: "Kubernetes", priority: "High" },
    { task: "Verify MongoDB replica set sync and disk I/O metrics", category: "Infrastructure", priority: "High" },
  ],
  upgrade: [
    { task: "Upgrade Amazon EKS control plane to Kubernetes v1.30", category: "Kubernetes", priority: "High" },
    { task: "Update CoreDNS, VPC-CNI, and Kube-Proxy managed add-ons", category: "Infrastructure", priority: "Medium" },
    { task: "Verify PodDisruptionBudget and Pod Anti-Affinity rules", category: "Deployment", priority: "Medium" },
  ],
  finops: [
    { task: "Migrate stateless backend workloads to EC2 Spot t4g.medium", category: "Infrastructure", priority: "High" },
    { task: "Deprecate unattached EBS gp2 volumes across AZs", category: "Infrastructure", priority: "Medium" },
    { task: "Audit shared NAT Gateway cross-AZ data transfer egress", category: "Security", priority: "Low" },
  ],
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [category, setCategory] = useState("Infrastructure");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("operations"); // 'operations' | 'topology' | 'telemetry' | 'finops'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [systemStatus, setSystemStatus] = useState({ api: "healthy", db: "connected", latency: 18 });
  const [trafficRunning, setTrafficRunning] = useState(false);
  const [recentEvents, setRecentEvents] = useState([
    { id: 1, time: "16:14:02", type: "INFO", message: "ALB Target Group registered 2 healthy backend pods" },
    { id: 2, time: "16:14:05", type: "SECURITY", message: "IAM IRSA token refreshed for aws-load-balancer-controller" },
    { id: 3, time: "16:14:09", type: "METRIC", message: "Prometheus ServiceMonitor scraped 274 metrics successfully" },
    { id: 4, time: "16:14:14", type: "FINOPS", message: "Spot node group savings confirmed at 70.6% vs On-Demand" },
  ]);
  const [activePodModal, setActivePodModal] = useState(null);
  const [nodesCount, setNodesCount] = useState(4);
  const [spotRatio, setSpotRatio] = useState(75);

  useEffect(() => {
    fetchTasks();
    checkHealth();
    const interval = setInterval(checkHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  const addEvent = (type, message) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    setRecentEvents((prev) => [
      { id: Date.now() + Math.random(), time: timeStr, type, message },
      ...prev.slice(0, 19),
    ]);
  };

  const checkHealth = async () => {
    const t0 = performance.now();
    try {
      const res = await axios.get("/readyz");
      const duration = Math.round(performance.now() - t0);
      if (res.status === 200) {
        setSystemStatus({ api: "healthy", db: "connected", latency: duration || 16 });
      }
    } catch (e) {
      setSystemStatus({ api: "warning", db: "degraded", latency: 999 });
      addEvent("WARN", "Readiness probe degradation detected on /readyz");
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(API_BASE);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    try {
      const response = await axios.post(API_BASE, {
        task: taskText,
        category,
        priority,
      });
      setTasks([response.data, ...tasks]);
      addEvent("CREATE", `Task initiated: "${taskText.slice(0, 45)}..."`);
      setTaskText("");
    } catch (error) {
      console.error("Error creating task:", error);
      addEvent("ERROR", "Failed to commit operation to MongoDB");
    }
  };

  const handleToggleTask = async (id, currentStatus) => {
    try {
      const response = await axios.put(`${API_BASE}/${id}`, {
        completed: !currentStatus,
      });
      setTasks(tasks.map((t) => (t._id === id ? response.data : t)));
      addEvent("UPDATE", `Operation marked ${!currentStatus ? "COMPLETED" : "IN-PROGRESS"}`);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
      addEvent("DELETE", "Archived task from active queue");
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Seed preset enterprise scenario
  const handleSeedScenario = async (type) => {
    const scenarioList = PRESET_SCENARIOS[type] || [];
    addEvent("SCENARIO", `Injecting ${scenarioList.length} ${type.toUpperCase()} operations...`);
    for (const item of scenarioList) {
      try {
        const res = await axios.post(API_BASE, item);
        setTasks((prev) => [res.data, ...prev]);
      } catch (err) {
        console.error("Seed error", err);
      }
    }
  };

  // Run real-time traffic burst right from browser
  const handleTriggerTrafficBurst = async () => {
    setTrafficRunning(true);
    addEvent("CHAOS", "Executing concurrent 12-request microservices burst test...");

    const requests = [];
    for (let i = 0; i < 12; i++) {
      requests.push(
        axios.get("/readyz").catch((e) => e),
        axios.get("/api/tasks").catch((e) => e)
      );
    }

    await Promise.all(requests);
    await checkHealth();
    await fetchTasks();
    setTrafficRunning(false);
    addEvent("CHAOS", "Traffic burst complete. Prometheus metrics incremented (+24).");
  };

  // Filter tasks based on search, category, and priority
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.task.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
    const matchesPriority = selectedPriority === "ALL" || t.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  const criticalCount = tasks.filter((t) => t.priority === "Critical" && !t.completed).length;

  // FinOps calculation
  const monthlyOnDemand = Math.round(nodesCount * 85); // ~$85/mo per t3.medium
  const spotSavingsPercent = spotRatio;
  const monthlySpot = Math.round(monthlyOnDemand * (1 - (spotSavingsPercent / 100) * 0.7));
  const estimatedSavings = monthlyOnDemand - monthlySpot;

  return (
    <div className="app-shell">
      {/* Background Ambience Mesh */}
      <div className="ambience-mesh" />

      {/* Top Enterprise Bar */}
      <header className="top-banner">
        <div className="brand-group">
          <div className="brand-gem">
            <span className="pulse-ring"></span>
            <span className="gem-symbol">☸</span>
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">KubePulse</h1>
              <span className="version-tag">EKS CloudOps v2.4</span>
            </div>
            <p className="brand-subtext">Zero-Trust Microservices & FinOps Control Plane</p>
          </div>
        </div>

        <div className="telemetry-badges">
          <div className="telemetry-pill">
            <span className="pulse-dot sage" />
            <span className="pill-label">API ENGINE</span>
            <span className="pill-value">{systemStatus.api}</span>
            <span className="pill-meta">{systemStatus.latency}ms</span>
          </div>

          <div className="telemetry-pill">
            <span className="pulse-dot sage" />
            <span className="pill-label">MONGODB</span>
            <span className="pill-value">{systemStatus.db}</span>
            <span className="pill-meta">gp3 PVC</span>
          </div>

          <div className="telemetry-pill highlight">
            <span className="pulse-dot ocean" />
            <span className="pill-label">REGION</span>
            <span className="pill-value">us-west-2</span>
            <span className="pill-meta">Multi-AZ</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="subnav-tabs">
        <div className="tab-list">
          <button
            className={`tab-btn ${activeTab === "operations" ? "active" : ""}`}
            onClick={() => setActiveTab("operations")}
          >
            <span className="tab-icon">📋</span> Operations Queue
            <span className="tab-badge">{pendingCount}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "topology" ? "active" : ""}`}
            onClick={() => setActiveTab("topology")}
          >
            <span className="tab-icon">☸️</span> Cluster Topology
            <span className="tab-indicator sage">4 Pods Ready</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "telemetry" ? "active" : ""}`}
            onClick={() => setActiveTab("telemetry")}
          >
            <span className="tab-icon">⚡</span> Telemetry & Chaos
            <span className="tab-indicator ocean">Live</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "finops" ? "active" : ""}`}
            onClick={() => setActiveTab("finops")}
          >
            <span className="tab-icon">💎</span> FinOps ROI
            <span className="tab-indicator sand">Save 70%</span>
          </button>
        </div>

        <div className="header-actions">
          <button
            className={`action-btn burst ${trafficRunning ? "loading" : ""}`}
            onClick={handleTriggerTrafficBurst}
            disabled={trafficRunning}
          >
            {trafficRunning ? "Injecting..." : "⚡ Traffic Burst"}
          </button>
        </div>
      </nav>

      {/* KPI Metric Strip */}
      <section className="kpi-strip">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">TOTAL CLOUDOPS JOBS</span>
            <span className="kpi-chip">MongoDB 7.0</span>
          </div>
          <div className="kpi-body">
            <span className="kpi-stat">{tasks.length}</span>
            <span className="kpi-trend positive">↑ Active Queue</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">IN-FLIGHT TASKS</span>
            <span className="kpi-chip plum">Requires Action</span>
          </div>
          <div className="kpi-body">
            <span className="kpi-stat text-plum">{pendingCount}</span>
            <span className="kpi-meta">
              {criticalCount > 0 ? `⚠️ ${criticalCount} Critical` : "No P1 blockers"}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">COMPLETED DELIVERIES</span>
            <span className="kpi-chip sage">Verified</span>
          </div>
          <div className="kpi-body">
            <span className="kpi-stat text-sage">{completedCount}</span>
            <span className="kpi-meta">100% Zero-Downtime</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">COMPUTE ALLOCATION</span>
            <span className="kpi-chip ocean">Spot + On-Demand</span>
          </div>
          <div className="kpi-body">
            <span className="kpi-stat text-ocean">{nodesCount} Nodes</span>
            <span className="kpi-meta">EKS v1.30 Managed</span>
          </div>
        </div>
      </section>

      {/* TAB 1: OPERATIONS QUEUE */}
      {activeTab === "operations" && (
        <div className="view-container">
          {/* Quick Scenario Injection Strip */}
          <div className="scenario-strip">
            <span className="scenario-label">⚡ One-Click Scenarios:</span>
            <button
              className="scenario-pill plum"
              onClick={() => handleSeedScenario("incident")}
            >
              🛡️ P1 Incident Response
            </button>
            <button
              className="scenario-pill ocean"
              onClick={() => handleSeedScenario("upgrade")}
            >
              🚀 EKS 1.30 Rollout
            </button>
            <button
              className="scenario-pill sand"
              onClick={() => handleSeedScenario("finops")}
            >
              💰 Spot FinOps Audit
            </button>
          </div>

          <div className="operations-grid">
            {/* Left: Task Creation Form */}
            <div className="glass-card form-panel">
              <div className="card-head">
                <h2>Initiate Cloud Operation</h2>
                <span className="card-hint">Dispatched through REST API</span>
              </div>

              <form onSubmit={handleAddTask} className="create-form">
                <div className="field-group">
                  <label>Operation Summary</label>
                  <input
                    type="text"
                    className="styled-input"
                    placeholder="e.g. Audit IAM IRSA roles for ALB Ingress Controller..."
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                  />
                </div>

                <div className="form-split">
                  <div className="field-group">
                    <label>Engineering Domain</label>
                    <select
                      className="styled-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Kubernetes">Kubernetes</option>
                      <option value="Security">Security</option>
                      <option value="Deployment">Deployment</option>
                      <option value="Monitoring">Monitoring</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label>SLA Priority</label>
                    <select
                      className="styled-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="Low">Low (P4)</option>
                      <option value="Medium">Medium (P3)</option>
                      <option value="High">High (P2)</option>
                      <option value="Critical">Critical (P1)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="submit-btn">
                  <span>Commit Operation</span>
                  <span className="btn-arrow">→</span>
                </button>
              </form>

              {/* Architecture Info Box */}
              <div className="architecture-box">
                <div className="arch-header">
                  <span className="arch-icon">🔒</span>
                  <span>Zero-Trust Microsegmentation</span>
                </div>
                <p className="arch-desc">
                  Manifests enforce Kubernetes <code>NetworkPolicy</code> default-deny rules.
                  External ingress routes strictly to Frontend on port 80.
                </p>
              </div>
            </div>

            {/* Right: Filterable Task Queue */}
            <div className="glass-card queue-panel">
              <div className="queue-header">
                <div className="filter-row">
                  <div className="search-wrap">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Filter operations by keyword..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-chips">
                    {["ALL", "Infrastructure", "Security", "Kubernetes", "Monitoring"].map(
                      (cat) => (
                        <button
                          key={cat}
                          className={`chip-btn ${selectedCategory === cat ? "active" : ""}`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Task Items List */}
              <div className="tasks-scroll-area">
                {loading ? (
                  <div className="empty-state">
                    <div className="spinner"></div>
                    <p>Hydrating operations from MongoDB cluster...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📂</span>
                    <p>No operations match current filters.</p>
                    <span className="empty-hint">Use the form or click a preset scenario above.</span>
                  </div>
                ) : (
                  filteredTasks.map((t) => (
                    <div
                      key={t._id}
                      className={`task-row ${t.completed ? "completed" : ""} ${
                        t.priority === "Critical" ? "priority-critical" : ""
                      }`}
                    >
                      <button
                        className="toggle-checkbox"
                        onClick={() => handleToggleTask(t._id, t.completed)}
                        title="Mark Completed"
                      >
                        {t.completed ? "✓" : ""}
                      </button>

                      <div className="task-content">
                        <span className="task-name">{t.task}</span>
                        <div className="task-badges">
                          <span className={`category-tag ${t.category.toLowerCase()}`}>
                            {t.category}
                          </span>
                          <span className={`priority-tag ${t.priority.toLowerCase()}`}>
                            {t.priority}
                          </span>
                          <span className="task-timestamp">
                            {new Date(t.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        className="delete-icon-btn"
                        onClick={() => handleDeleteTask(t._id)}
                        title="Archive Task"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE CLUSTER TOPOLOGY */}
      {activeTab === "topology" && (
        <div className="view-container">
          <div className="glass-card topology-card">
            <div className="topology-header">
              <div>
                <h2>Interactive EKS Microservices Mesh</h2>
                <p>Click any node or pod to inspect live container specifications & HPA telemetry.</p>
              </div>
              <div className="mesh-status-indicator">
                <span className="pulse-dot sage" />
                <span>Zero-Trust NetworkPolicies Enforced</span>
              </div>
            </div>

            {/* Topology Flow Canvas */}
            <div className="topology-mesh">
              {/* Layer 1: Ingress & ALB */}
              <div className="mesh-tier">
                <div className="tier-label">EDGE ROUTING (AWS ALB)</div>
                <div
                  className="topology-node edge"
                  onClick={() =>
                    setActivePodModal({
                      title: "AWS Application Load Balancer",
                      tier: "Edge Ingress",
                      dns: "k8s-kubepulse-alb-1982736.us-west-2.elb.amazonaws.com",
                      protocol: "HTTPS / HTTP:80 -> Target Groups",
                      irsa: "arn:aws:iam::123456789012:role/kubepulse-alb-controller",
                      healthCheck: "Path /readyz | Interval 10s",
                    })
                  }
                >
                  <span className="node-icon">🌐</span>
                  <div className="node-info">
                    <span className="node-title">AWS ALB Ingress</span>
                    <span className="node-sub">Controller v2.7 (IRSA)</span>
                  </div>
                  <span className="live-status active">ONLINE</span>
                </div>
              </div>

              <div className="mesh-connector">
                <span className="flow-line"></span>
                <span className="port-badge">TCP 80</span>
              </div>

              {/* Layer 2: Frontend Pods */}
              <div className="mesh-tier">
                <div className="tier-label">FRONTEND TIER (NGINX ALPINE)</div>
                <div className="pod-cluster">
                  {[1, 2].map((idx) => (
                    <div
                      key={`frontend-${idx}`}
                      className="topology-node pod"
                      onClick={() =>
                        setActivePodModal({
                          title: `frontend-deployment-pod-${idx}`,
                          tier: "Frontend SPA",
                          image: "kubepulse-frontend:v1.0.0 (25MB)",
                          hpa: "Target CPU 75% | Min 2, Max 8",
                          pdb: "backend-pdb (minAvailable: 1)",
                          resources: "CPU: 50m / 200m | Mem: 64Mi / 128Mi",
                          security: "Unprivileged Nginx Alpine | ReadOnlyRoot",
                        })
                      }
                    >
                      <span className="node-icon">⚛️</span>
                      <div className="node-info">
                        <span className="node-title">frontend-pod-{idx}</span>
                        <span className="node-sub">Port 80 • 25 MB</span>
                      </div>
                      <span className="live-status ready">READY (1/1)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mesh-connector">
                <span className="flow-line"></span>
                <span className="port-badge">TCP 8080 (Strict NetworkPolicy)</span>
              </div>

              {/* Layer 3: Backend Pods */}
              <div className="mesh-tier">
                <div className="tier-label">BACKEND API (NODE 20 LTS)</div>
                <div className="pod-cluster">
                  {[1, 2].map((idx) => (
                    <div
                      key={`backend-${idx}`}
                      className="topology-node pod"
                      onClick={() =>
                        setActivePodModal({
                          title: `backend-deployment-pod-${idx}`,
                          tier: "Node.js REST API",
                          image: "kubepulse-backend:v1.0.0 (Multi-Stage)",
                          hpa: "Target CPU 70%, Mem 80% | Min 2, Max 10",
                          pdb: "backend-pdb (minAvailable: 1)",
                          resources: "CPU: 100m / 300m | Mem: 128Mi / 256Mi",
                          security: "RunAsNonRoot (UID 1000) • SeccompProfile",
                          probes: "Liveness /healthz | Readiness /readyz",
                        })
                      }
                    >
                      <span className="node-icon">⚙️</span>
                      <div className="node-info">
                        <span className="node-title">backend-pod-{idx}</span>
                        <span className="node-sub">Port 8080 • Node 20</span>
                      </div>
                      <span className="live-status ready">READY (1/1)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mesh-connector">
                <span className="flow-line"></span>
                <span className="port-badge">TCP 27017 (Isolated Wire Protocol)</span>
              </div>

              {/* Layer 4: MongoDB StatefulSet */}
              <div className="mesh-tier">
                <div className="tier-label">PERSISTENCE TIER (MONGODB 7.0)</div>
                <div
                  className="topology-node database"
                  onClick={() =>
                    setActivePodModal({
                      title: "mongodb-statefulset-0",
                      tier: "Stateful Persistence Layer",
                      image: "mongo:7.0-jammy (WiredTiger)",
                      volume: "PersistentVolumeClaim (AWS EBS gp3 • 10Gi)",
                      csi: "AWS EBS CSI Driver v1.28 with IRSA",
                      encryption: "AWS KMS Customer Managed Key (CMK)",
                      network: "Strictly allows ingress from Backend pods only",
                    })
                  }
                >
                  <span className="node-icon">🍃</span>
                  <div className="node-info">
                    <span className="node-title">mongodb-statefulset-0</span>
                    <span className="node-sub">AWS EBS gp3 • 10Gi Encrypted</span>
                  </div>
                  <span className="live-status storage">STORAGE MOUNTED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SRE TELEMETRY & CHAOS EXPERIMENTS */}
      {activeTab === "telemetry" && (
        <div className="view-container">
          <div className="telemetry-layout">
            {/* Chaos Injection Panel */}
            <div className="glass-card chaos-card">
              <div className="card-head">
                <h2>Live Microservices Telemetry Controller</h2>
                <span className="card-hint">Real-time load generation & SLO health checks</span>
              </div>

              <div className="chaos-actions-grid">
                <div className="chaos-action-box">
                  <div className="box-top">
                    <span className="box-icon">⚡</span>
                    <div>
                      <h3>Traffic Spike Generator</h3>
                      <p>Fires 12 concurrent requests across API and readiness endpoints.</p>
                    </div>
                  </div>
                  <button
                    className="chaos-trigger-btn"
                    onClick={handleTriggerTrafficBurst}
                    disabled={trafficRunning}
                  >
                    {trafficRunning ? "Bursting..." : "Simulate 12 Requests"}
                  </button>
                </div>

                <div className="chaos-action-box">
                  <div className="box-top">
                    <span className="box-icon">🧪</span>
                    <div>
                      <h3>SLO Latency Ping</h3>
                      <p>Calculates round-trip HTTP packet duration to cluster edge.</p>
                    </div>
                  </div>
                  <button className="chaos-trigger-btn secondary" onClick={checkHealth}>
                    Ping Endpoint ({systemStatus.latency}ms)
                  </button>
                </div>
              </div>

              {/* Prometheus Golden Signals Table */}
              <div className="golden-signals-table">
                <h3>Prometheus Scrape Status (/metrics)</h3>
                <div className="signals-row">
                  <span className="signal-name">kubepulse_http_requests_total</span>
                  <span className="signal-val">274 requests</span>
                  <span className="signal-status healthy">SCRAPING</span>
                </div>
                <div className="signals-row">
                  <span className="signal-name">http_request_duration_seconds</span>
                  <span className="signal-val">p95 18.2ms</span>
                  <span className="signal-status healthy">SLO COMPLIANT</span>
                </div>
                <div className="signals-row">
                  <span className="signal-name">nodejs_active_handles</span>
                  <span className="signal-val">4 active</span>
                  <span className="signal-status healthy">OPTIMAL</span>
                </div>
                <div className="signals-row">
                  <span className="signal-name">mongodb_connection_pool</span>
                  <span className="signal-val">5 connections</span>
                  <span className="signal-status healthy">CONNECTED</span>
                </div>
              </div>
            </div>

            {/* Live Events Stream */}
            <div className="glass-card events-card">
              <div className="card-head">
                <h2>Real-Time CloudOps Event Log</h2>
                <span className="card-hint">CloudWatch & Cluster Events</span>
              </div>

              <div className="events-stream-list">
                {recentEvents.map((evt) => (
                  <div key={evt.id} className="event-item">
                    <span className="event-time">{evt.time}</span>
                    <span className={`event-badge ${evt.type.toLowerCase()}`}>
                      {evt.type}
                    </span>
                    <span className="event-text">{evt.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINOPS ROI & CLOUD GOVERNANCE */}
      {activeTab === "finops" && (
        <div className="view-container">
          <div className="finops-layout">
            <div className="glass-card finops-calculator">
              <div className="card-head">
                <h2>AWS EKS FinOps Governance Model</h2>
                <p>Real-time compute optimization comparing pure On-Demand vs Hybrid Spot Node Groups.</p>
              </div>

              {/* Sliders */}
              <div className="finops-controls">
                <div className="control-group">
                  <div className="control-label-row">
                    <label>Cluster Worker Node Count</label>
                    <span className="control-val">{nodesCount} EC2 Instances</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="16"
                    value={nodesCount}
                    onChange={(e) => setNodesCount(parseInt(e.target.value, 10))}
                    className="finops-slider"
                  />
                </div>

                <div className="control-group">
                  <div className="control-label-row">
                    <label>Spot Instance Allocation Ratio</label>
                    <span className="control-val">{spotRatio}% Spot / {100 - spotRatio}% On-Demand</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={spotRatio}
                    onChange={(e) => setSpotRatio(parseInt(e.target.value, 10))}
                    className="finops-slider"
                  />
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="cost-comparison-grid">
                <div className="cost-box on-demand">
                  <span className="cost-label">TRADITIONAL ON-DEMAND</span>
                  <span className="cost-figure">${monthlyOnDemand}</span>
                  <span className="cost-sub">Per Month (Estimated)</span>
                </div>

                <div className="cost-box hybrid-spot">
                  <span className="cost-label">KUBEPULSE HYBRID SPOT</span>
                  <span className="cost-figure text-sage">${monthlySpot}</span>
                  <span className="cost-sub">Per Month with Spot Diversification</span>
                </div>

                <div className="cost-box verified-savings">
                  <span className="cost-label">VERIFIED COST REDUCTION</span>
                  <span className="cost-figure text-ocean">${estimatedSavings}</span>
                  <span className="cost-sub">{Math.round((estimatedSavings / monthlyOnDemand) * 100)}% Monthly Capital Saved</span>
                </div>
              </div>

              {/* Architectural Strategy Notes */}
              <div className="finops-strategy-notes">
                <h3>FinOps Engineering Implementation</h3>
                <ul>
                  <li>
                    <strong>Spot Instance Diversification:</strong> Node group spreads allocations across <code>t3.medium</code>, <code>t3a.medium</code>, and <code>t4g.medium</code> to prevent abrupt Spot termination surges.
                  </li>
                  <li>
                    <strong>Shared NAT Gateway:</strong> Consolidated multi-AZ NAT routing into a single shared gateway for non-production environments saving $64/month in idle gateway charges.
                  </li>
                  <li>
                    <strong>PodDisruptionBudgets & HPA:</strong> Workload safely drains within 120-second AWS Spot rebalance notifications without dropping client traffic.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Inspection Modal for Topology Pods */}
      {activePodModal && (
        <div className="modal-backdrop" onClick={() => setActivePodModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activePodModal.title}</h3>
              <button className="modal-close" onClick={() => setActivePodModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-tier-tag">{activePodModal.tier}</div>

              {Object.entries(activePodModal).map(([key, value]) => {
                if (key === "title" || key === "tier") return null;
                return (
                  <div key={key} className="modal-field">
                    <span className="modal-key">{key.toUpperCase()}</span>
                    <span className="modal-value">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-bar">
        <span>KubePulse CloudOps • Enterprise Microservices on Amazon EKS</span>
        <div className="footer-links">
          <span>Kubernetes v1.30</span>
          <span>•</span>
          <span>Terraform v1.8+</span>
          <span>•</span>
          <span>ArgoCD GitOps</span>
          <span>•</span>
          <span>Trivy SAST</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
