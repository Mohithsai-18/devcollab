# DevCollab — Real-Time Project Management Platform

A full-stack collaborative project management and code review platform built with React, Node.js, MySQL, and Socket.io.

## 🚀 Features

- **Authentication** — JWT-based login/register with role-based access (Admin, Lead, Developer, Reviewer)
- **Project Management** — Create projects, add team members, track deadlines
- **Real-Time Kanban Board** — Drag and drop tasks across columns with live updates via Socket.io
- **Task Management** — Create tasks with priority levels, story points, and assignments
- **Sprint Planning** — Create sprints, assign tasks, track velocity
- **Analytics Dashboard** — Pie charts, bar charts, burndown charts, velocity tracking
- **Notifications** — Real-time activity notifications

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Bootstrap 5, Recharts |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| File Upload | Multer |

## 📁 Project Structure
```
devcollab/
├── client/          # React frontend (port 3000)
│   └── src/
│       ├── components/
│       ├── context/     # Auth + Socket context
│       ├── pages/       # Login, Register, Dashboard, ProjectView, Analytics
│       └── utils/       # Axios config
└── server/          # Node.js backend (port 5000)
    ├── config/      # MySQL connection
    ├── controllers/ # Auth, Projects, Tasks, Sprints, Analytics
    ├── middleware/  # JWT auth, Role check
    ├── routes/      # API routes
    └── socket/      # Socket.io events
```

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.0
- Git

### Backend Setup
```bash
cd server
npm install
# Create .env file with your DB credentials
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
npm start
```

### Database Setup
```bash
mysql -u root -p
source server/models/schema.sql
```

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/projects | Get all projects |
| POST | /api/projects | Create project |
| GET | /api/tasks/project/:id | Get project tasks |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id/status | Update task status |
| GET | /api/analytics/project/:id | Get analytics |

## 👥 Team

Built as a B.Tech final year project.

## 📄 License

MIT
```

Save **Ctrl + S**

---

Now final push:
```
git add .
```
```
git commit -m "docs: complete README with setup instructions and API docs"
```
```
git push origin master