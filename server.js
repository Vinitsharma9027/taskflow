const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/authRoutes');
const projectRoutes = require('./src/projectRoutes');
const taskRoutes = require('./src/taskRoutes');
const dashboardRoutes = require('./src/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Serve frontend for all non-API routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
const fs = require("fs");

app.get("/reset", (req, res) => {
  fs.writeFileSync("./data/db.json", JSON.stringify({
    users: [],
    projects: [],
    tasks: []
  }, null, 2));

  res.send("Database reset successful");
});

app.listen(PORT, () => {
  console.log(`TaskFlow server running on port ${PORT}`);
});

module.exports = app;
