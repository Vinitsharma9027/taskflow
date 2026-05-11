// ===== STATE =====
const state = {
  token: localStorage.getItem('tf_token'),
  user: null,
  projects: [],
  currentProject: null,
  currentTasks: [],
  currentMembers: [],
  editingTask: null,
  editingProject: null,
  selectedColor: '#6366f1',
  allUsers: []
};

// ===== API =====
const API_BASE = '/api';

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const get = (path) => api('GET', path);
const post = (path, body) => api('POST', path, body);
const put = (path, body) => api('PUT', path, body);
const del = (path) => api('DELETE', path);

// ===== TOAST =====
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ===== SHOW/HIDE =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${id}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === id));
  document.getElementById('topbar-title').textContent = id === 'dashboard' ? 'Dashboard' : id === 'projects' ? 'Projects' : 'My Tasks';
  // Hide topbar actions unless needed
  document.getElementById('topbar-actions').innerHTML = '';
}

function showModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(`modal-${id}`).classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  state.editingTask = null;
  state.editingProject = null;
}

// ===== FORMATTERS =====
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}
function getPriorityLabel(p) {
  return { low: 'Low', medium: 'Med', high: 'High', urgent: 'Urgent' }[p] || p;
}
function getStatusLabel(s) {
  return { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }[s] || s;
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ===== AUTH =====
async function initAuth() {
  if (!state.token) { showScreen('auth-screen'); return; }
  try {
    const data = await get('/auth/me');
    state.user = data.user;
    initApp();
  } catch {
    state.token = null;
    localStorage.removeItem('tf_token');
    showScreen('auth-screen');
  }
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    document.getElementById('auth-error').classList.add('hidden');
  });
});

function setAuthLoading(btn, loading) {
  const span = btn.querySelector('span');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  span.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');
  setAuthLoading(btn, true);
  try {
    const data = await post('/auth/login', { email, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('tf_token', data.token);
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  } finally {
    setAuthLoading(btn, false);
  }
});

document.getElementById('signup-btn').addEventListener('click', async () => {
  const btn = document.getElementById('signup-btn');
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');
  setAuthLoading(btn, true);
  try {
    const data = await post('/auth/signup', { name, email, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('tf_token', data.token);
    initApp();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
  } finally {
    setAuthLoading(btn, false);
  }
});

// Enter key for auth
['login-email','login-password'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });
});
['signup-name','signup-email','signup-password'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('signup-btn').click(); });
});

document.getElementById('logout-btn').addEventListener('click', () => {
  state.token = null; state.user = null; state.projects = [];
  localStorage.removeItem('tf_token');
  showScreen('auth-screen');
});

// ===== APP INIT =====
async function initApp() {
  showScreen('app-screen');
  document.getElementById('user-avatar').textContent = state.user.avatar || state.user.name[0];
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-role').textContent = state.user.globalRole;

  await loadProjects();
  loadDashboard();
  showView('dashboard');
  document.getElementById('dash-greeting').textContent = `${getGreeting()}, ${state.user.name.split(' ')[0]} 👋`;

  // Load all users for task assignment
  try {
    const d = await get('/auth/users');
    state.allUsers = d.users;
  } catch {}
}

// ===== PROJECTS =====
async function loadProjects() {
  try {
    const data = await get('/projects');
    state.projects = data.projects;
    renderSidebarProjects();
    renderProjectsGrid();
  } catch (e) { toast(e.message, 'error'); }
}

function renderSidebarProjects() {
  const el = document.getElementById('sidebar-project-list');
  el.innerHTML = state.projects.map(p => `
    <div class="sidebar-proj-item ${state.currentProject?.id === p.id ? 'active' : ''}" data-pid="${p.id}">
      <div class="proj-dot" style="background:${p.color}"></div>
      <span>${escHtml(p.name)}</span>
    </div>
  `).join('');
  el.querySelectorAll('.sidebar-proj-item').forEach(item => {
    item.addEventListener('click', () => openProject(item.dataset.pid));
  });
}

function renderProjectsGrid() {
  const grid = document.getElementById('projects-grid');
  const empty = document.getElementById('projects-empty');
  if (state.projects.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    grid.innerHTML = state.projects.map(p => {
      const pct = p.taskCount > 0 ? Math.round((p.completedTasks / p.taskCount) * 100) : 0;
      return `<div class="project-card" data-pid="${p.id}" style="border-top-color:${p.color}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div class="project-card-name">${escHtml(p.name)}</div>
          <span class="project-badge ${p.userRole === 'admin' ? 'admin' : ''}">${p.userRole}</span>
        </div>
        <div class="project-card-desc">${escHtml(p.description) || '<span style="color:var(--text3);font-style:italic">No description</span>'}</div>
        <div class="project-card-stats">
          <div class="project-progress">
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${p.color}"></div></div>
            <span class="progress-pct">${pct}%</span>
          </div>
          <div class="project-card-meta">${p.taskCount} tasks · ${p.memberCount} members</div>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => openProject(card.dataset.pid));
    });
  }
}

async function openProject(projectId) {
  try {
    const data = await get(`/projects/${projectId}`);
    state.currentProject = data.project;
    state.currentTasks = data.project.tasks || [];
    state.currentMembers = data.project.members || [];
    renderProjectDetail();
    showView('project-detail');
    document.getElementById('topbar-title').textContent = state.currentProject.name;
    renderSidebarProjects();
    closeSidebar();
  } catch (e) { toast(e.message, 'error'); }
}

function renderProjectDetail() {
  const p = state.currentProject;
  document.getElementById('project-detail-name').textContent = p.name;

  // Actions
  const actionsEl = document.getElementById('project-actions');
  const isAdmin = p.userRole === 'admin';
  actionsEl.innerHTML = `
    <button class="btn-primary" id="new-task-btn">+ New Task</button>
    ${isAdmin ? `<button class="btn-ghost" id="edit-project-btn">Edit</button>` : ''}
    ${isAdmin ? `<button class="btn-ghost" id="delete-project-btn" style="color:var(--red);border-color:var(--red)">Delete</button>` : ''}
  `;
  document.getElementById('new-task-btn').addEventListener('click', () => openTaskModal());
  if (isAdmin) {
    document.getElementById('edit-project-btn').addEventListener('click', () => openProjectModal(p));
    document.getElementById('delete-project-btn').addEventListener('click', async () => {
      if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
      try {
        await del(`/projects/${p.id}`);
        toast('Project deleted');
        await loadProjects();
        showView('projects');
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  // Members admin actions
  const membersAdmin = document.getElementById('members-admin-actions');
  membersAdmin.classList.toggle('hidden', !isAdmin);

  renderKanban();
  renderTaskList();
  renderMembers();
}

// ===== KANBAN =====
function renderKanban() {
  const statuses = ['todo', 'in_progress', 'in_review', 'done'];
  statuses.forEach(status => {
    const tasks = state.currentTasks.filter(t => t.status === status);
    document.getElementById(`count-${status}`).textContent = tasks.length;
    document.getElementById(`col-${status}`).innerHTML = tasks.map(t => renderTaskCard(t)).join('');
  });
  // Add click listeners
  document.querySelectorAll('.kanban-col .task-card').forEach(card => {
    card.addEventListener('click', () => {
      const task = state.currentTasks.find(t => t.id === card.dataset.tid);
      if (task) openTaskModal(task);
    });
  });
  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => openTaskModal(null, btn.dataset.status));
  });
}

function renderTaskCard(t) {
  const due = t.dueDate ? `<span class="task-due ${isOverdue(t.dueDate) && t.status !== 'done' ? 'overdue' : ''}">${isOverdue(t.dueDate) && t.status !== 'done' ? '⚠ ' : ''}${formatDate(t.dueDate)}</span>` : '';
  const assigneeHtml = t.assignee ? `<span class="avatar sm" style="margin-left:auto">${t.assignee.avatar || t.assignee.name[0]}</span>` : '';
  return `<div class="task-card" data-tid="${t.id}">
    <div class="task-card-title">${escHtml(t.title)}</div>
    <div class="task-card-meta">
      <span class="priority-badge ${t.priority}">${getPriorityLabel(t.priority)}</span>
      ${due}
      ${assigneeHtml}
    </div>
  </div>`;
}

// ===== TASK LIST =====
function renderTaskList(filter = {}) {
  const tasks = state.currentTasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.search && !t.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });
  document.getElementById('task-list-body').innerHTML = tasks.map(t => renderTaskRow(t)).join('');
  bindTaskRowActions('task-list-body');
}

function renderTaskRow(t, showProject = false) {
  const project = showProject ? state.projects.find(p => p.id === t.projectId) : null;
  const colInfo = showProject
    ? `<div class="task-row-proj"><div class="proj-color-dot" style="background:${project?.color || '#888'}"></div>${escHtml(project?.name || '—')}</div>`
    : `<div class="avatar sm">${t.assignee ? (t.assignee.avatar || t.assignee.name[0]) : '?'}</div>`;
  return `<div class="table-row" data-tid="${t.id}" data-pid="${t.projectId}">
    <span class="task-row-title">${escHtml(t.title)}</span>
    ${colInfo}
    <span class="priority-badge ${t.priority}">${getPriorityLabel(t.priority)}</span>
    <span class="status-chip ${t.status}">${getStatusLabel(t.status)}</span>
    <span class="${isOverdue(t.dueDate) && t.status !== 'done' ? 'task-due overdue' : 'task-due'}">${formatDate(t.dueDate)}</span>
    <div class="row-actions">
      <button class="action-btn edit" title="Edit">✎</button>
      <button class="action-btn del" title="Delete">✕</button>
    </div>
  </div>`;
}

function bindTaskRowActions(containerId) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.table-row').forEach(row => {
    const tid = row.dataset.tid;
    const pid = row.dataset.pid;
    row.querySelector('.edit')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      let task = state.currentTasks.find(t => t.id === tid);
      if (!task && pid) {
        // My tasks view - need to load project first
        try {
          await openProject(pid);
          task = state.currentTasks.find(t => t.id === tid);
        } catch {}
      }
      if (task) openTaskModal(task);
    });
    row.querySelector('.del')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this task?')) return;
      const actualPid = pid || state.currentProject?.id;
      try {
        await del(`/projects/${actualPid}/tasks/${tid}`);
        toast('Task deleted');
        state.currentTasks = state.currentTasks.filter(t => t.id !== tid);
        renderKanban(); renderTaskList(getListFilter());
        loadDashboard();
      } catch (e) { toast(e.message, 'error'); }
    });
  });
}

function getListFilter() {
  return {
    status: document.getElementById('filter-status')?.value,
    priority: document.getElementById('filter-priority')?.value,
    search: document.getElementById('task-search')?.value
  };
}

// List filter listeners
document.getElementById('filter-status').addEventListener('change', () => renderTaskList(getListFilter()));
document.getElementById('filter-priority').addEventListener('change', () => renderTaskList(getListFilter()));
document.getElementById('task-search').addEventListener('input', () => renderTaskList(getListFilter()));

// ===== MEMBERS =====
function renderMembers() {
  const isAdmin = state.currentProject?.userRole === 'admin';
  document.getElementById('members-list').innerHTML = state.currentMembers.map(m => `
    <div class="member-row">
      <div class="avatar">${m.user.avatar || m.user.name[0]}</div>
      <div class="member-info">
        <div class="member-name">${escHtml(m.user.name)}</div>
        <div class="member-email">${escHtml(m.user.email)}</div>
      </div>
      <span class="role-badge ${m.role}">${m.role}</span>
      ${isAdmin && m.userId !== state.user.id ? `
        <select class="filter-select" style="width:auto;font-size:12px" data-uid="${m.userId}" onchange="changeMemberRole(this)">
          <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
          <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
        <button class="btn-danger" onclick="removeMember('${m.userId}')">Remove</button>
      ` : ''}
    </div>
  `).join('');
}

window.changeMemberRole = async function(sel) {
  try {
    await put(`/projects/${state.currentProject.id}/members/${sel.dataset.uid}`, { role: sel.value });
    toast('Role updated');
  } catch (e) { toast(e.message, 'error'); }
};

window.removeMember = async function(userId) {
  if (!confirm('Remove this member?')) return;
  try {
    await del(`/projects/${state.currentProject.id}/members/${userId}`);
    state.currentMembers = state.currentMembers.filter(m => m.userId !== userId);
    renderMembers();
    toast('Member removed');
  } catch (e) { toast(e.message, 'error'); }
};

document.getElementById('add-member-btn').addEventListener('click', async () => {
  const email = document.getElementById('add-member-email').value.trim();
  const role = document.getElementById('add-member-role').value;
  if (!email) return toast('Enter an email', 'error');
  try {
    const data = await post(`/projects/${state.currentProject.id}/members`, { email, role });
    state.currentMembers.push(data.member);
    renderMembers();
    document.getElementById('add-member-email').value = '';
    toast('Member added');
  } catch (e) { toast(e.message, 'error'); }
});

// ===== PROJECT MODAL =====
function openProjectModal(project = null) {
  state.editingProject = project;
  document.getElementById('project-modal-title').textContent = project ? 'Edit Project' : 'New Project';
  document.getElementById('proj-name').value = project?.name || '';
  document.getElementById('proj-desc').value = project?.description || '';
  const color = project?.color || '#6366f1';
  state.selectedColor = color;
  document.querySelectorAll('.color-opt').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.color === color);
  });
  document.getElementById('save-project-btn').textContent = project ? 'Save Changes' : 'Create Project';
  showModal('project');
}

document.getElementById('proj-color-picker').addEventListener('click', e => {
  const opt = e.target.closest('.color-opt');
  if (!opt) return;
  document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('selected'));
  opt.classList.add('selected');
  state.selectedColor = opt.dataset.color;
});

document.getElementById('save-project-btn').addEventListener('click', async () => {
  const name = document.getElementById('proj-name').value.trim();
  const description = document.getElementById('proj-desc').value.trim();
  if (!name) return toast('Project name required', 'error');
  try {
    let project;
    if (state.editingProject) {
      const data = await put(`/projects/${state.editingProject.id}`, { name, description, color: state.selectedColor });
      project = data.project;
      toast('Project updated');
    } else {
      const data = await post('/projects', { name, description, color: state.selectedColor });
      project = data.project;
      toast('Project created');
    }
    hideModal();
    await loadProjects();
    if (state.editingProject) {
      state.currentProject = { ...state.currentProject, ...project };
      document.getElementById('project-detail-name').textContent = project.name;
    }
  } catch (e) { toast(e.message, 'error'); }
});

// ===== TASK MODAL =====
function openTaskModal(task = null, defaultStatus = 'todo') {
  state.editingTask = task;
  document.getElementById('task-modal-title').textContent = task ? 'Edit Task' : 'New Task';
  document.getElementById('task-title').value = task?.title || '';
  document.getElementById('task-desc').value = task?.description || '';
  document.getElementById('task-status').value = task?.status || defaultStatus;
  document.getElementById('task-priority').value = task?.priority || 'medium';
  document.getElementById('task-assignee').value = task?.assigneeId || '';
  document.getElementById('task-due').value = task?.dueDate ? task.dueDate.split('T')[0] : '';

  // Populate assignees
  const assigneeEl = document.getElementById('task-assignee');
  assigneeEl.innerHTML = '<option value="">Unassigned</option>';
  const members = state.currentMembers.length > 0 ? state.currentMembers.map(m => m.user) : state.allUsers;
  members.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id; opt.textContent = u.name;
    if (u.id === task?.assigneeId) opt.selected = true;
    assigneeEl.appendChild(opt);
  });

  document.getElementById('save-task-btn').textContent = task ? 'Save Changes' : 'Create Task';
  showModal('task');
}

document.getElementById('save-task-btn').addEventListener('click', async () => {
  const title = document.getElementById('task-title').value.trim();
  if (!title) return toast('Task title required', 'error');
  const body = {
    title,
    description: document.getElementById('task-desc').value.trim(),
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    assigneeId: document.getElementById('task-assignee').value || null,
    dueDate: document.getElementById('task-due').value || null
  };
  const pid = state.currentProject.id;
  try {
    let task;
    if (state.editingTask) {
      const data = await put(`/projects/${pid}/tasks/${state.editingTask.id}`, body);
      task = data.task;
      state.currentTasks = state.currentTasks.map(t => t.id === task.id ? task : t);
      toast('Task updated');
    } else {
      const data = await post(`/projects/${pid}/tasks`, body);
      task = data.task;
      state.currentTasks.push(task);
      toast('Task created');
    }
    hideModal();
    renderKanban();
    renderTaskList(getListFilter());
    loadDashboard();
  } catch (e) { toast(e.message, 'error'); }
});

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await get('/dashboard');
    const { stats, recentTasks, projectsSummary } = data;

    document.getElementById('stat-projects').textContent = stats.totalProjects;
    document.getElementById('stat-tasks').textContent = stats.totalTasks;
    document.getElementById('stat-my').textContent = stats.myTasks;
    document.getElementById('stat-overdue').textContent = stats.myOverdue;

    // Status bars
    const total = stats.totalTasks || 1;
    document.getElementById('status-bars').innerHTML = [
      { key: 'todo', label: 'To Do', color: 'var(--text3)' },
      { key: 'in_progress', label: 'In Progress', color: 'var(--yellow)' },
      { key: 'in_review', label: 'In Review', color: 'var(--blue)' },
      { key: 'done', label: 'Done', color: 'var(--green)' }
    ].map(s => {
      const count = stats.byStatus[s.key] || 0;
      const pct = Math.round((count / total) * 100);
      return `<div class="status-bar-item">
        <div class="status-bar-label"><span>${s.label}</span><span>${count}</span></div>
        <div class="status-bar-track"><div class="status-bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
      </div>`;
    }).join('');

    // Recent tasks
    document.getElementById('recent-list').innerHTML = recentTasks.length
      ? recentTasks.map(t => `<div class="recent-item">
          <div class="recent-dot" style="background:${t.projectColor || '#888'}"></div>
          <div class="recent-info">
            <div class="recent-title">${escHtml(t.title)}</div>
            <div class="recent-meta">${escHtml(t.projectName || '')} · <span class="status-chip ${t.status}" style="font-size:10px;padding:1px 6px">${getStatusLabel(t.status)}</span></div>
          </div>
        </div>`).join('')
      : '<div style="color:var(--text3);font-size:13px;padding:8px 0">No recent activity</div>';

    // Projects summary
    document.getElementById('dash-projects-grid').innerHTML = projectsSummary.map(p => {
      const pct = p.taskCount > 0 ? Math.round((p.completedTasks / p.taskCount) * 100) : 0;
      return `<div class="project-card" data-pid="${p.id}" style="border-top-color:${p.color}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div class="project-card-name">${escHtml(p.name)}</div>
          ${p.overdueTasks > 0 ? `<span style="font-size:11px;color:var(--red);font-weight:600">⚠ ${p.overdueTasks} overdue</span>` : ''}
        </div>
        <div class="project-card-desc">${escHtml(p.description) || ''}</div>
        <div class="project-card-stats">
          <div class="project-progress">
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${p.color}"></div></div>
            <span class="progress-pct">${pct}%</span>
          </div>
          <div class="project-card-meta">${p.completedTasks}/${p.taskCount} done</div>
        </div>
      </div>`;
    }).join('') || '<div style="color:var(--text3);padding:20px;text-align:center">No projects yet</div>';

    document.querySelectorAll('#dash-projects-grid .project-card').forEach(c => {
      c.addEventListener('click', () => openProject(c.dataset.pid));
    });
  } catch (e) {}
}

// ===== MY TASKS =====
async function loadMyTasks() {
  try {
    const data = await get('/dashboard');
    // Get all tasks assigned to me across projects
    const tasks = [];
    for (const p of state.projects) {
      try {
        const td = await get(`/projects/${p.id}/tasks`);
        td.tasks.filter(t => t.assigneeId === state.user.id).forEach(t => tasks.push({ ...t, projectName: p.name, projectColor: p.color }));
      } catch {}
    }
    renderMyTasks(tasks);
  } catch {}
}

function renderMyTasks(tasks, filter = {}) {
  const allTasks = tasks || window._myTasks || [];
  window._myTasks = allTasks;
  const filtered = allTasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    return true;
  });
  document.getElementById('mytasks-list-body').innerHTML = filtered.map(t => {
    return `<div class="table-row" data-tid="${t.id}" data-pid="${t.projectId}">
      <span class="task-row-title">${escHtml(t.title)}</span>
      <div class="task-row-proj"><div class="proj-color-dot" style="background:${t.projectColor||'#888'}"></div>${escHtml(t.projectName||'—')}</div>
      <span class="priority-badge ${t.priority}">${getPriorityLabel(t.priority)}</span>
      <span class="status-chip ${t.status}">${getStatusLabel(t.status)}</span>
      <span class="${isOverdue(t.dueDate)&&t.status!=='done'?'task-due overdue':'task-due'}">${formatDate(t.dueDate)}</span>
      <div class="row-actions">
        <button class="action-btn edit" title="Go to project">→</button>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--text3);padding:20px;text-align:center">No tasks assigned to you</div>';

  document.getElementById('mytasks-list-body').querySelectorAll('.table-row').forEach(row => {
    row.querySelector('.edit')?.addEventListener('click', () => openProject(row.dataset.pid));
  });
}

document.getElementById('mytasks-filter-status').addEventListener('change', () => renderMyTasks(null, { status: document.getElementById('mytasks-filter-status').value, priority: document.getElementById('mytasks-filter-priority').value }));
document.getElementById('mytasks-filter-priority').addEventListener('change', () => renderMyTasks(null, { status: document.getElementById('mytasks-filter-status').value, priority: document.getElementById('mytasks-filter-priority').value }));

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const view = item.dataset.view;
    state.currentProject = null;
    renderSidebarProjects();
    showView(view);
    if (view === 'dashboard') loadDashboard();
    if (view === 'projects') { loadProjects(); renderProjectsGrid(); }
    if (view === 'my-tasks') { window._myTasks = []; loadMyTasks(); }
    closeSidebar();
  });
});

document.getElementById('back-to-projects').addEventListener('click', e => {
  e.preventDefault();
  state.currentProject = null;
  renderSidebarProjects();
  loadProjects();
  showView('projects');
});

// ===== PROJECT TABS =====
document.querySelectorAll('.project-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.project-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ptab').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`ptab-${tab.dataset.ptab}`).classList.add('active');
  });
});

// ===== NEW PROJECT =====
document.getElementById('new-project-btn').addEventListener('click', () => openProjectModal());
document.getElementById('projects-new-btn').addEventListener('click', () => openProjectModal());
document.getElementById('projects-empty-new-btn').addEventListener('click', () => openProjectModal());

// ===== MODAL CLOSE =====
document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', hideModal));
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) hideModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });

// ===== SIDEBAR TOGGLE =====
document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

// ===== UTILS =====
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== BOOT =====
initAuth();
