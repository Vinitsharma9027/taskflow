# 🚀 TaskFlow — Team Task Manager

A full-stack web application for creating projects, assigning tasks, and tracking team progress with role-based access control.

---

## 🌐 Live Demo

> **[https://taskflow-production-45fe.up.railway.app]**

---

## ✨ Features

### Authentication

- Secure JWT-based signup/login
- Password hashing with bcrypt
- **First user auto-assigned as Global Admin**
- 7-day session tokens

### Role-Based Access Control

| Role               | Capabilities                                        |
| ------------------ | --------------------------------------------------- |
| **Global Admin**   | Full access to all projects, members, tasks         |
| **Project Admin**  | Manage project settings, members, all tasks         |
| **Project Member** | View project, create tasks, edit own/assigned tasks |

### Project Management

- Create, edit, delete projects
- Color-coded project cards
- Progress tracking with visual progress bars
- Overdue task warnings per project

### Task Management

- **Kanban board** (To Do → In Progress → In Review → Done)
- **List view** with search, status & priority filters
- Set priority: Low, Medium, High, Urgent
- Assign tasks to project members
- Due dates with overdue alerts
- Task descriptions

### Team Management

- Invite members by email
- Assign/change member roles (Admin/Member)
- Remove members from projects

### Dashboard

- At-a-glance stats: projects, total tasks, my tasks, overdue count
- Status distribution bars
- Recent activity feed
- Projects overview with progress

---

## 🏗 Tech Stack

| Layer          | Technology                                            |
| -------------- | ----------------------------------------------------- |
| **Backend**    | Node.js + Express.js                                  |
| **Database**   | JSON file store (zero-dependency, Railway-compatible) |
| **Auth**       | JWT + bcryptjs                                        |
| **Frontend**   | Vanilla JS SPA (no build step)                        |
| **Fonts**      | Syne + DM Sans (Google Fonts)                         |
| **Deployment** | Railway                                               |

---

## 📦 Project Structure

```
taskflow/
├── server.js              # Express app entry point
├── src/
│   ├── db.js              # JSON file database layer
│   ├── auth.js            # JWT middleware & helpers
│   ├── authRoutes.js      # POST /auth/signup, login, GET /me
│   ├── projectRoutes.js   # CRUD projects + members
│   ├── taskRoutes.js      # CRUD tasks per project
│   └── dashboardRoutes.js # Dashboard stats API
├── public/
│   ├── index.html         # SPA shell
│   ├── css/app.css        # Full UI styles
│   └── js/app.js          # Frontend logic
├── data/
│   └── db.json            # Auto-created persistent store
├── railway.toml           # Railway deployment config
└── README.md
```

---

## 🚀 Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# 4. Start the server
npm start

# 5. Open http://localhost:3000
```

---

## 🌐 Deploy to Railway

### Option A: Railway Dashboard (Recommended)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your repo
4. Add environment variables:
   - `JWT_SECRET` = any long random string (e.g. `openssl rand -hex 32`)
5. Railway auto-detects Node.js and deploys 🎉

### Option B: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
# Set env vars:
railway variables set JWT_SECRET=your-secret-here
```

> ⚠️ **Note on persistence:** The default JSON store writes to the filesystem. Railway's filesystem is **ephemeral** — data resets on redeploy. For production persistence, swap `src/db.js` to use Railway's PostgreSQL plugin (connection string via `DATABASE_URL`).

---

## 📡 REST API Reference

### Auth

```
POST /api/auth/signup    { name, email, password }
POST /api/auth/login     { email, password }
GET  /api/auth/me        → current user (Bearer token)
GET  /api/auth/users     → all users list
```

### Projects

```
GET    /api/projects
POST   /api/projects           { name, description, color }
GET    /api/projects/:id
PUT    /api/projects/:id       { name, description, color }
DELETE /api/projects/:id
```

### Project Members

```
GET    /api/projects/:id/members
POST   /api/projects/:id/members    { email, role }
PUT    /api/projects/:id/members/:userId   { role }
DELETE /api/projects/:id/members/:userId
```

### Tasks

```
GET    /api/projects/:pid/tasks
POST   /api/projects/:pid/tasks     { title, description, status, priority, assigneeId, dueDate }
GET    /api/projects/:pid/tasks/:id
PUT    /api/projects/:pid/tasks/:id
DELETE /api/projects/:pid/tasks/:id
```

### Dashboard

```
GET /api/dashboard → { stats, recentTasks, projectsSummary, overdueDetail }
```

---

## 🔒 Authorization Rules

- **Creating tasks**: Any project member
- **Editing tasks**: Task creator, assignee, or project admin
- **Deleting tasks**: Task creator or project admin
- **Managing members**: Project admin only
- **Deleting projects**: Project admin only
- **Viewing projects**: Project members + global admin

---
