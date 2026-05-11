const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('./auth');

const router = express.Router();

// GET /api/projects - get projects user is member of (or all if admin)
router.get('/', authenticate, (req, res) => {
  let projects = db.getProjects();
  if (req.user.globalRole !== 'admin') {
    const memberships = db.getMembersByUser(req.user.id);
    const projectIds = new Set(memberships.map(m => m.projectId));
    projects = projects.filter(p => projectIds.has(p.id));
  }
  // Enrich with member count and task count
  const enriched = projects.map(p => {
    const members = db.getMembersByProject(p.id);
    const tasks = db.getTasksByProject(p.id);
    const membership = db.getMember(p.id, req.user.id);
    return {
      ...p,
      memberCount: members.length,
      taskCount: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      userRole: req.user.globalRole === 'admin' ? 'admin' : (membership?.role || 'member')
    };
  });
  res.json({ projects: enriched });
});

// POST /api/projects
router.post('/', authenticate, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  const project = {
    id: uuidv4(),
    name: name.trim(),
    description: description?.trim() || '',
    color: color || '#6366f1',
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.createProject(project);
  // Auto-add creator as admin member
  db.addMember({ projectId: project.id, userId: req.user.id, role: 'admin', joinedAt: new Date().toISOString() });
  res.status(201).json({ project });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectMember, (req, res) => {
  const project = db.getProjectById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const members = db.getMembersByProject(project.id).map(m => {
    const user = db.getUserById(m.userId);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return { ...m, user: safeUser };
  }).filter(Boolean);
  const tasks = db.getTasksByProject(project.id).map(t => {
    const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : null;
    return { ...t, assignee: assignee ? { id: assignee.id, name: assignee.name, avatar: assignee.avatar } : null };
  });
  const membership = db.getMember(project.id, req.user.id);
  res.json({
    project: {
      ...project,
      members,
      tasks,
      userRole: req.user.globalRole === 'admin' ? 'admin' : (membership?.role || 'member')
    }
  });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectAdmin, (req, res) => {
  const { name, description, color } = req.body;
  const updates = { updatedAt: new Date().toISOString() };
  if (name) updates.name = name.trim();
  if (description !== undefined) updates.description = description.trim();
  if (color) updates.color = color;
  const project = db.updateProject(req.params.projectId, updates);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectAdmin, (req, res) => {
  db.deleteProject(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// GET /api/projects/:projectId/members
router.get('/:projectId/members', authenticate, requireProjectMember, (req, res) => {
  const members = db.getMembersByProject(req.params.projectId).map(m => {
    const user = db.getUserById(m.userId);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return { ...m, user: safeUser };
  }).filter(Boolean);
  res.json({ members });
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', authenticate, requireProjectAdmin, (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = db.getUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const existing = db.getMember(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User already a member' });
  const member = db.addMember({
    projectId: req.params.projectId,
    userId: user.id,
    role: role || 'member',
    joinedAt: new Date().toISOString()
  });
  const { password: _, ...safeUser } = user;
  res.status(201).json({ member: { ...member, user: safeUser } });
});

// PUT /api/projects/:projectId/members/:userId
router.put('/:projectId/members/:userId', authenticate, requireProjectAdmin, (req, res) => {
  const { role } = req.body;
  if (!role) return res.status(400).json({ error: 'Role required' });
  const member = db.updateMember(req.params.projectId, req.params.userId, { role });
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json({ member });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectAdmin, (req, res) => {
  db.removeMember(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
