import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "/api/tasks";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

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
    if (!newTask.trim()) return;
    try {
      const response = await axios.post(API_BASE, {
        task: newTask,
        category: "Infrastructure",
        priority: "Medium",
      });
      setTasks([response.data, ...tasks]);
      setNewTask("");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>KubePulse CloudOps</h1>
        <p>Enterprise 3-Tier EKS Operations Platform</p>
      </header>
      <main className="main-content">
        <form onSubmit={handleAddTask} className="task-form">
          <input
            type="text"
            placeholder="Deploy new microservice or provision cluster..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button type="submit">Add Operation</button>
        </form>
        {loading ? (
          <p>Loading operations...</p>
        ) : (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t._id} className="task-item">
                <span>{t.task}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default App;
