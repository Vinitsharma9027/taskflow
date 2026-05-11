const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

const defaultDB = {
  users: [],
  projects: [],
  tasks: [],
  members: []
};

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
      return { ...defaultDB };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { ...defaultDB };
  }
}

function writeDB(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Users
function getUsers() { return readDB().users; }
function getUserById(id) { return readDB().users.find(u => u.id === id); }
function getUserByEmail(email) { return readDB().users.find(u => u.email === email.toLowerCase()); }
function createUser(user) {
  const db = readDB();
  db.users.push(user);
  writeDB(db);
  return user;
}
function updateUser(id, updates) {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeDB(db);
  return db.users[idx];
}

// Projects
function getProjects() { return readDB().projects; }
function getProjectById(id) { return readDB().projects.find(p => p.id === id); }
function createProject(project) {
  const db = readDB();
  db.projects.push(project);
  writeDB(db);
  return project;
}
function updateProject(id, updates) {
  const db = readDB();
  const idx = db.projects.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.projects[idx] = { ...db.projects[idx], ...updates };
  writeDB(db);
  return db.projects[idx];
}
function deleteProject(id) {
  const db = readDB();
  db.projects = db.projects.filter(p => p.id !== id);
  db.tasks = db.tasks.filter(t => t.projectId !== id);
  db.members = db.members.filter(m => m.projectId !== id);
  writeDB(db);
}

// Tasks
function getTasks() { return readDB().tasks; }
function getTaskById(id) { return readDB().tasks.find(t => t.id === id); }
function getTasksByProject(projectId) { return readDB().tasks.filter(t => t.projectId === projectId); }
function getTasksByAssignee(userId) { return readDB().tasks.filter(t => t.assigneeId === userId); }
function createTask(task) {
  const db = readDB();
  db.tasks.push(task);
  writeDB(db);
  return task;
}
function updateTask(id, updates) {
  const db = readDB();
  const idx = db.tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  db.tasks[idx] = { ...db.tasks[idx], ...updates };
  writeDB(db);
  return db.tasks[idx];
}
function deleteTask(id) {
  const db = readDB();
  db.tasks = db.tasks.filter(t => t.id !== id);
  writeDB(db);
}

// Members (project memberships)
function getMembers() { return readDB().members; }
function getMembersByProject(projectId) { return readDB().members.filter(m => m.projectId === projectId); }
function getMembersByUser(userId) { return readDB().members.filter(m => m.userId === userId); }
function getMember(projectId, userId) { return readDB().members.find(m => m.projectId === projectId && m.userId === userId); }
function addMember(member) {
  const db = readDB();
  db.members.push(member);
  writeDB(db);
  return member;
}
function updateMember(projectId, userId, updates) {
  const db = readDB();
  const idx = db.members.findIndex(m => m.projectId === projectId && m.userId === userId);
  if (idx === -1) return null;
  db.members[idx] = { ...db.members[idx], ...updates };
  writeDB(db);
  return db.members[idx];
}
function removeMember(projectId, userId) {
  const db = readDB();
  db.members = db.members.filter(m => !(m.projectId === projectId && m.userId === userId));
  writeDB(db);
}

module.exports = {
  getUsers, getUserById, getUserByEmail, createUser, updateUser,
  getProjects, getProjectById, createProject, updateProject, deleteProject,
  getTasks, getTaskById, getTasksByProject, getTasksByAssignee, createTask, updateTask, deleteTask,
  getMembers, getMembersByProject, getMembersByUser, getMember, addMember, updateMember, removeMember
};
