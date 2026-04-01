# DevCollab — Real-Time Project Management Platform

> A full-stack collaborative project management and code review platform built with React, Node.js, MySQL, and Socket.io.

---

## 🚀 Features

- **Authentication** — JWT-based login/register with role-based access (Admin, Lead, Developer, Reviewer)
- **Project Management** — Create projects, add team members, track deadlines
- **Real-Time Kanban Board** — Drag and drop tasks across columns with live updates via Socket.io
- **Task Management** — Create tasks with priority levels, story points, and assignments
- **Sprint Planning** — Create sprints, assign tasks, track velocity
- **Analytics Dashboard** — Pie charts, bar charts, burndown charts, velocity tracking
- **Notifications** — Real-time activity notifications
- **GitHub Integration** — Connect multiple GitHub repositories per project

---

## 🛠️ Tech Stack

| Layer      | Technology                       |
|------------|----------------------------------|
| Frontend   | React.js, Bootstrap 5, Recharts  |
| Backend    | Node.js, Express.js              |
| Database   | MySQL 8.0                        |
| Real-time  | Socket.io                        |
| Auth       | JWT + bcrypt                     |
| File Upload| Multer                           |

---

## 📁 Project Structure

```
devcollab/
├── client/               # React frontend (port 3000)
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── context/      # Auth + Socket context
│       ├── pages/        # Login, Register, Dashboard, ProjectView, Analytics
│       └── utils/        # Axios config
└── server/               # Node.js backend (port 5000)
    ├── config/           # MySQL connection
    ├── controllers/      # Auth, Projects, Tasks, Sprints, Analytics
    ├── middleware/        # JWT auth, Role check
    ├── routes/           # API routes
    ├── models/           # DB schema
    └── socket/           # Socket.io events
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL 8.0
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Mohithsai-18/devcollab.git
cd devcollab
```

### 2. Database Setup
```bash
mysql -u root -p
source server/models/schema.sql
```

### 3. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file inside `server/`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=devcollab
JWT_SECRET=your_jwt_secret
PORT=5000
```

Then run:
```bash
npm run dev
```

### 4. Frontend Setup
```bash
cd client
npm install
npm start
```

The app will be available at `http://localhost:3000`

---

## 🔗 API Endpoints

| Method | Endpoint                      | Description          |
|--------|-------------------------------|----------------------|
| POST   | /api/auth/register            | Register user        |
| POST   | /api/auth/login               | Login user           |
| GET    | /api/projects                 | Get all projects     |
| POST   | /api/projects                 | Create project       |
| GET    | /api/tasks/project/:id        | Get project tasks    |
| POST   | /api/tasks                    | Create task          |
| PATCH  | /api/tasks/:id/status         | Update task status   |
| GET    | /api/analytics/project/:id    | Get analytics data   |
| GET    | /api/sprints/project/:id      | Get project sprints  |
| POST   | /api/sprints                  | Create sprint        |

---

## 👥 Team

This project was built as a **B.Tech Final Year Project** by:

| Name                    | Role                  |
|-------------------------|-----------------------|
| **NADIPI MOHITH**       | Full Stack Developer  |
| **KONA RITHIK SAI KUMAR** | Full Stack Developer |
| **DANNANA JAYANTH**     | Full Stack Developer  |

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
