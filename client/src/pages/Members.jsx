import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

function Members() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAdding(true);
    try {
      await api.post(`/projects/${id}/members`, { email, role });
      setSuccess(`${email} added successfully!`);
      setEmail('');
      setRole('developer');
      fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'danger',
      lead: 'warning',
      developer: 'primary',
      reviewer: 'info'
    };
    return colors[role] || 'secondary';
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: '👑',
      lead: '⭐',
      developer: '💻',
      reviewer: '🔍'
    };
    return icons[role] || '👤';
  };

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" />
    </div>
  );

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
            Team Members — {project?.name}
          </span>
        </div>
      </nav>

      <div className="container mt-4" style={{ maxWidth: '800px' }}>

        {/* Add Member Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white">
            <h6 className="fw-bold mb-0">➕ Add Team Member</h6>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger py-2">{error}</div>
            )}
            {success && (
              <div className="alert alert-success py-2">{success}</div>
            )}
            <form onSubmit={handleAddMember}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="teammate@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <small className="text-muted">
                    They must already have a DevCollab account
                  </small>
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Role</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                  >
                    <option value="developer">💻 Developer</option>
                    <option value="reviewer">🔍 Reviewer</option>
                    <option value="lead">⭐ Project Lead</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={adding}
                  >
                    {adding ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : 'Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Members List */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between">
            <h6 className="fw-bold mb-0">👥 Team Members</h6>
            <span className="badge bg-primary">{members.length} members</span>
          </div>
          <div className="card-body p-0">
            {members.length === 0 ? (
              <div className="text-center py-4 text-muted">
                No members yet
              </div>
            ) : (
              members.map((member, index) => (
                <div
                  key={member.id}
                  className={`d-flex align-items-center justify-content-between p-3 ${index !== members.length - 1 ? 'border-bottom' : ''}`}
                >
                  <div className="d-flex align-items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{
                        width: '45px', height: '45px',
                        backgroundColor: `hsl(${member.id * 47 % 360}, 60%, 50%)`,
                        fontSize: '16px'
                      }}
                    >
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="mb-0 fw-semibold">{member.name}</p>
                      <small className="text-muted">{member.email}</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge bg-${getRoleBadgeColor(member.role)}`}>
                      {getRoleIcon(member.role)} {member.role}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Role Legend */}
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white">
            <h6 className="fw-bold mb-0">📋 Role Permissions</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-danger">👑 Admin</span>
                  <small className="text-muted">Full access — manage members, delete project</small>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-warning">⭐ Lead</span>
                  <small className="text-muted">Manage sprints, assign tasks, create projects</small>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary">💻 Developer</span>
                  <small className="text-muted">Create tasks, submit code for review</small>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-info">🔍 Reviewer</span>
                  <small className="text-muted">Review code, resolve comments</small>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Members;