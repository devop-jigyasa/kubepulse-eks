import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "/api/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [category, setCategory] = useState("Infrastructure");
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({ api: "checking", db: "checking" });

  useEffect(() => {
    fetchTasks();
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await axios.get("/readyz");
      if (res.status === 200) {
        setSystemStatus({ api: "healthy", db: "connected" });
      }
    } catch (e) {
      setSystemStatus({ api: "warning", db: "degraded" });
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
      setTaskText("");
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleToggleTask = async (id, currentStatus) => {
    try {
      const response = await axios.put(`${API_BASE}/${id}`, {
        completed: !currentStatus,
      });
      setTasks(tasks.map((t) => (t._id === id ? response.data : t)));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`);
      setTasks(tasks.filter((t) => t._id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="kubepulse-layout">
      {/* Top Navigation */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="logo-icon">☸️</div>
          <div>
            <h1>KubePulse <span className="badge-cloud">CloudOps</span></h1>
            <p className="subtitle">3-Tier Distributed Operations Platform on Amazon EKS</p>
          </div>
        </div>
        <div className="health-badges">
          <div className={`status-pill ${systemStatus.api}`}>
            <span className="dot"></span>
            API: {systemStatus.api}
          </div>
          <div className={`status-pill ${systemStatus.db === "connected" ? "healthy" : "warning"}`}>
            <span className="dot"></span>
            DB: {systemStatus.db}
          </div>
        </div>
      </header>

      {/* Metrics Bar */}
      <section className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Operations</span>
          <span className="metric-value">{tasks.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">In-Flight Tasks</span>
          <span className="metric-value text-amber">{pendingCount}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Completed Deployments</span>
          <span className="metric-value text-emerald">{completedCount}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Target Cluster</span>
          <span className="metric-value text-blue">EKS v1.30</span>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="dashboard-content">
        {/* Create Task Form */}
        <div className="card form-card">
          <h2>Create CloudOps Operation</h2>
          <form onSubmit={handleAddTask} className="create-task-form">
            <div className="input-group">
              <input
                type="text"
                placeholder="e.g., Deploy AWS Load Balancer Controller with IRSA..."
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="select-group">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="CI/CD Pipeline">CI/CD Pipeline</option>
                  <option value="Kubernetes">Kubernetes</option>
                  <option value="Security">Security</option>
                  <option value="Monitoring">Monitoring</option>
                </select>
              </div>

              <div className="select-group">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <button type="submit" className="btn-primary">
                + Dispatch Operation
              </button>
            </div>
          </form>
        </div>

        {/* Task List Section */}
        <div className="card list-card">
          <div className="list-header">
            <h2>Active Operations Queue</h2>
            <button onClick={fetchTasks} className="btn-refresh">
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-state">Loading cluster operations...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <p>No operations currently in queue. Dispatch your first CloudOps task above!</p>
            </div>
          ) : (
            <div className="task-queue">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className={`task-row ${task.completed ? "task-completed" : ""}`}
                >
                  <div className="task-left">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task._id, task.completed)}
                      className="task-checkbox"
                    />
                    <div className="task-details">
                      <span className="task-title">{task.task}</span>
                      <div className="task-meta">
                        <span className={`tag-category tag-${task.category.toLowerCase().replace(/[^a-z]/g, '')}`}>
                          {task.category}
                        </span>
                        <span className={`tag-priority priority-${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                        <span className="task-timestamp">
                          {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="btn-delete"
                    title="Terminate Task"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>KubePulse CloudOps Platform • Architecture: React + Node.js 20 + MongoDB + AWS EKS</p>
      </footer>
    </div>
  );
}

export default App;
