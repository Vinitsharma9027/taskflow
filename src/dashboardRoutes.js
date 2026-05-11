const express = require('express');
const db = require('./db');
const { authenticate } = require('./auth');

const router = express.Router();

// GET /api/dashboard - personal + cross-project stats
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.globalRole === 'admin';

  // Get all accessible projects
  let allProjects = db.getProjects();
  if (!isAdmin) {
    const memberships = db.getMembersByUser(userId);
    const projectIds = new Set(memberships.map(m => m.projectId));
    allProjects = allProjects.filter(p => projectIds.has(p.id));
  }

  const projectIds = allProjects.map(p => p.id);
  const allTasks = db.getTasks().filter(t => projectIds.includes(t.projectId));

  const now = new Date();

  // My tasks
  const myTasks = allTasks.filter(t => t.assigneeId === userId);
  const overdueTasks = myTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done');

  // Stats
  const stats = {
    totalProjects: allProjects.length,
    totalTasks: allTasks.length,
    myTasks: myTasks.length,
    myOverdue: overdueTasks.length,
    byStatus: {
      todo: allTasks.filter(t => t.status === 'todo').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      in_review: allTasks.filter(t => t.status === 'in_review').length,
      done: allTasks.filter(t => t.status === 'done').length,
    }
  };

  // Recent tasks (last 10 updated)
  const recentTasks = allTasks
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 10)
    .map(t => {
      const project = db.getProjectById(t.projectId);
      const assignee = t.assigneeId ? db.getUserById(t.assigneeId) : null;
      return {
        ...t,
        projectName: project?.name,
        projectColor: project?.color,
        assignee: assignee ? { id: assignee.id, name: assignee.name, avatar: assignee.avatar } : null
      };
    });

  // Projects summary
  const projectsSummary = allProjects.map(p => {
    const tasks = allTasks.filter(t => t.projectId === p.id);
    const membership = db.getMember(p.id, userId);
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      description: p.description,
      taskCount: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
      userRole: isAdmin ? 'admin' : (membership?.role || 'member')
    };
  });

  // My overdue tasks detail
  const overdueDetail = overdueTasks.map(t => {
    const project = db.getProjectById(t.projectId);
    return { ...t, projectName: project?.name, projectColor: project?.color };
  });

  res.json({ stats, recentTasks, projectsSummary, overdueDetail });
});

module.exports = router;
