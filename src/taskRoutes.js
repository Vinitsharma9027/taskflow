const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { authenticate, requireProjectMember, requireProjectAdmin } = require('./auth');

const router = express.Router({ mergeParams: true });

const VALID_STATUSES = ['todo', 'in_progress', 'in_review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectMember, (req, res) => {
  const tasks = db.getTasksByProject(req.params.projectId).map(t => {
    const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : null;
    const creator = db.getUserById(t.createdBy);
    return {
      ...t,
      assignee: assignee ? { id: assignee.id, name: assignee.name, avatar: assignee.avatar } : null,
      creator: creator ? { id: creator.id, name: creator.name } : null
    };
  });
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectMember, (req, res) => {
  const { title, description, status, priority, assigneeId, dueDate, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title required' });
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  if (assigneeId) {
    const member = db.getMember(req.params.projectId, assigneeId);
    if (!member && req.user.globalRole !== 'admin') {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }
  const task = {
    id: uuidv4(),
    projectId: req.params.projectId,
    title: title.trim(),
    description: description?.trim() || '',
    status: status || 'todo',
    priority: priority || 'medium',
    assigneeId: assigneeId || null,
    dueDate: dueDate || null,
    tags: tags || [],
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.createTask(task);
  const assignee = task.assigneeId ? db.getUserById(task.assigneeId) : null;
  res.status(201).json({
    task: {
      ...task,
      assignee: assignee ? { id: assignee.id, name: assignee.name, avatar: assignee.avatar } : null
    }
  });
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectMember, (req, res) => {
  const task = db.getTaskById(req.params.taskId);
  if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ error: 'Task not found' });
  const assignee = task.assigneeId ? db.getUserById(task.assigneeId) : null;
  res.json({
    task: {
      ...task,
      assignee: assignee ? { id: assignee.id, name: assignee.name, avatar: assignee.avatar } : null
    }
  });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectMember, (req, res) => {
  const task = db.getTaskById(req.params.taskId);
  if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ error: 'Task not found' });

  // Only assignee, project admin, or task creator can update
  const membership = db.getMember(req.params.projectId, req.user.id);
  const isAdmin = req.user.globalRole === 'admin' || membership?.role === 'admin';
  const isCreator = task.createdBy === req.user.id;
  const isAssignee = task.assigneeId === req.user.id;
  if (!isAdmin && !isCreator && !isAssignee) {
    return res.status(403).json({ error: 'Not authorized to update this task' });
  }

  const { title, description, status, priority, assigneeId, dueDate, tags } = req.body;
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

  const updates = { updatedAt: new Date().toISOString() };
  if (title) updates.title = title.trim();
  if (description !== undefined) updates.description = description.trim();
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (tags) updates.tags = tags;

  const updated = db.updateTask(req.params.taskId, updates);
  const assignee = updated.assigneeId ? db.getUserById(updated.assigneeId) : null;
  res.json({
    task: {
      ...updated,
      assignee: assignee ? { id: assignee.id, name: assignee.name, avatar: assignee.avatar } : null
    }
  });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, (req, res) => {
  const task = db.getTaskById(req.params.taskId);
  if (!task || task.projectId !== req.params.projectId) return res.status(404).json({ error: 'Task not found' });
  const membership = db.getMember(req.params.projectId, req.user.id);
  const isAdmin = req.user.globalRole === 'admin' || membership?.role === 'admin';
  const isCreator = task.createdBy === req.user.id;
  if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Not authorized' });
  db.deleteTask(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
