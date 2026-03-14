import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid, ResponsiveContainer
} from 'recharts';
import api from '../utils/api';

const STATUS_COLORS = {
  backlog: '#6c757d',
  todo: '#0d6efd',
  in_progress: '#fd7e14',
  in_review: '#6f42c1',
  done: '#198754'
};

const PRIORITY_COLORS = {
  p1: '#dc3545',
  p2: '#ffc107',
  p3: '#0dcaf0',
  p4: '#6c757d'
};

const PRIORITY_LABELS = {
  p1: 'Critical', p2: 'High', p3: 'Medium', p4: 'Low'
};

function Analytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [velocity, setVelocity] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [analyticsRes, velocityRes, projectRes] = await Promise.all([
        api.get(`/analytics/project/${id}`),
        api.get(`/analytics/velocity/${id}`),
        api.get(`/projects/${id}`)
      ]);
      setData(analyticsRes.data);
      setVelocity(velocityRes.data);
      setProject(projectRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" />
    </div>
  );

  // Format data for charts
  const taskStatusData = data?.taskStats?.map(s => ({
    name: s.status.replace('_', ' '),
    value: parseInt(s.count),
    color: STATUS_COLORS[s.status] || '#ccc'
  })) || [];

  const priorityData = data?.priorityStats?.map(p => ({
    name: PRIORITY_LABELS[p.priority] || p.priority,
    count: parseInt(p.count),
    color: PRIORITY_COLORS[p.priority] || '#ccc'
  })) || [];

  const memberData = data?.memberStats?.map(m => ({
    name: m.name,
    assigned: parseInt(m.assigned_tasks) || 0,
    completed: parseInt(m.completed_tasks) || 0
  })) || [];

  const points = data?.pointStats;
  const completionPct = points?.total_points > 0
    ? Math.round((points.completed_points / points.total_points) * 100)
    : 0;

  return (
    <div className="min-vh-100 bg-light">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => navigate(`/project/${id}`)}
          >
            ← Back
          </button>
          <span className="navbar-brand fw-bold mb-0">
            Analytics — {project?.name}
          </span>
        </div>
      </nav>

      <div className="container mt-4">

        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center p-3 border-0 shadow-sm">
              <h2 className="text-primary fw-bold">
                {taskStatusData.reduce((s, t) => s + t.value, 0)}
              </h2>
              <p className="mb-0 text-muted">Total Tasks</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-0 shadow-sm">
              <h2 className="text-success fw-bold">
                {taskStatusData.find(t => t.name === 'done')?.value || 0}
              </h2>
              <p className="mb-0 text-muted">Completed</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-0 shadow-sm">
              <h2 className="text-warning fw-bold">{points?.total_points || 0}</h2>
              <p className="mb-0 text-muted">Total Points</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-0 shadow-sm">
              <h2 className="text-info fw-bold">{completionPct}%</h2>
              <p className="mb-0 text-muted">Completion</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="card shadow-sm border-0 mb-4 p-3">
          <h6 className="fw-bold mb-2">Overall Progress</h6>
          <div className="progress" style={{ height: '20px' }}>
            <div
              className="progress-bar bg-success"
              style={{ width: `${completionPct}%` }}
            >
              {completionPct}%
            </div>
          </div>
          <div className="d-flex justify-content-between mt-1">
            <small className="text-muted">
              {points?.completed_points || 0} points done
            </small>
            <small className="text-muted">
              {points?.total_points || 0} total points
            </small>
          </div>
        </div>

        <div className="row mb-4">

          {/* Task Status Pie Chart */}
          <div className="col-md-6">
            <div className="card shadow-sm border-0 p-3 h-100">
              <h6 className="fw-bold mb-3">Tasks by Status</h6>
              {taskStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {taskStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted mt-5">No tasks yet</div>
              )}
            </div>
          </div>

          {/* Priority Bar Chart */}
          <div className="col-md-6">
            <div className="card shadow-sm border-0 p-3 h-100">
              <h6 className="fw-bold mb-3">Tasks by Priority</h6>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Tasks">
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted mt-5">No tasks yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Member Contribution */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card shadow-sm border-0 p-3">
              <h6 className="fw-bold mb-3">Member Contributions</h6>
              {memberData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={memberData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="assigned" name="Assigned" fill="#0d6efd" />
                    <Bar dataKey="completed" name="Completed" fill="#198754" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted mt-5">No members yet</div>
              )}
            </div>
          </div>

          {/* Velocity Chart */}
          <div className="col-md-6">
            <div className="card shadow-sm border-0 p-3">
              <h6 className="fw-bold mb-3">Sprint Velocity</h6>
              {velocity.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={velocity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="velocity"
                      name="Velocity"
                      stroke="#0d6efd"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="capacity_points"
                      name="Capacity"
                      stroke="#fd7e14"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted mt-4">
                  <p>No completed sprints yet</p>
                  <small>Velocity data appears after sprints are completed</small>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Analytics;