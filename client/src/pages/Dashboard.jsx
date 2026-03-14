import NotificationBell from '../components/Notifications/NotificationBell';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', deadline: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/projects', formData);
      setShowModal(false);
      setFormData({ name: '', description: '', deadline: '' });
      fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const totalTasks = projects.reduce((sum, p) => sum + (p.task_count || 0), 0);

  return (
    <div className="min-vh-100 bg-light">

      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4">
        <span className="navbar-brand fw-bold fs-4">DevCollab</span>
        <div className="d-flex align-items-center gap-3">
  <span className="text-white">Welcome, {user?.name}</span>
  <span className="badge bg-light text-primary">{user?.role}</span>
  <NotificationBell />
  <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
    Logout
  </button>
</div>
      </nav>

      <div className="container mt-4">

        {/* Stats Row */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center p-3 border-primary">
              <h2 className="text-primary fw-bold">{projects.length}</h2>
              <p className="mb-0 text-muted">Projects</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-success">
              <h2 className="text-success fw-bold">{totalTasks}</h2>
              <p className="mb-0 text-muted">Total Tasks</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-warning">
              <h2 className="text-warning fw-bold">
                {projects.filter(p => p.status === 'active').length}
              </h2>
              <p className="mb-0 text-muted">Active</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center p-3 border-info">
              <h2 className="text-info fw-bold">
                {projects.filter(p => p.status === 'archived').length}
              </h2>
              <p className="mb-0 text-muted">Archived</p>
            </div>
          </div>
        </div>

        {/* Projects Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold mb-0">My Projects</h4>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + New Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center mt-5">
            <div className="spinner-border text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center mt-5">
            <h5 className="text-muted">No projects yet</h5>
            <p className="text-muted">Click "New Project" to create your first one</p>
          </div>
        ) : (
          <div className="row">
            {projects.map(project => (
              <div className="col-md-4 mb-4" key={project.id}>
                <div
                  className="card h-100 shadow-sm border-0 project-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title fw-bold mb-0">{project.name}</h5>
                      <span className={`badge ${project.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="card-text text-muted small">
                      {project.description || 'No description'}
                    </p>
                    <hr />
                    <div className="d-flex justify-content-between text-muted small">
                      <span>👥 {project.member_count} members</span>
                      <span>📋 {project.task_count} tasks</span>
                    </div>
                    {project.deadline && (
                      <div className="mt-2 text-muted small">
                        📅 Due: {new Date(project.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create New Project</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Project Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. DevCollab Platform"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="What is this project about?"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.deadline}
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;