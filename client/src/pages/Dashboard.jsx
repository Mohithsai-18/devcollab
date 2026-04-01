import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import NotificationBell from '../components/Notifications/NotificationBell';

function Dashboard() {
  const { user, logout } = useAuth();

  const { socket } = useSocket();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', deadline: '' });
  const [creating, setCreating] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.get('/activities');
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchActivities();
  }, [fetchProjects, fetchActivities]);

  const projectIdsRef = React.useRef([]);

  useEffect(() => {
    projectIdsRef.current = projects.map(p => p.id);
  }, [projects]);

  useEffect(() => {
    if (!socket) return;

    const joinAll = () => {
      projectIdsRef.current.forEach(pid => socket.emit('join_project', pid));
    };
    joinAll();

    const handleUpdate = () => {
      fetchActivities();
      fetchProjects();
    };

    socket.on('new_task', handleUpdate);
    socket.on('task_updated', handleUpdate);
    socket.on('task_assignment', handleUpdate);

    return () => {
      projectIdsRef.current.forEach(pid => socket.emit('leave_project', pid));
      socket.off('new_task', handleUpdate);
      socket.off('task_updated', handleUpdate);
      socket.off('task_assignment', handleUpdate);
    };
  }, [socket, fetchActivities, fetchProjects]);

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
    <div className="dark-page-bg" style={{ paddingBottom: '40px' }}>

      {/* Navbar */}
      <nav className="d-flex justify-content-between align-items-center px-4" style={{ height: '72px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <span className="fw-bold fs-4 text-white d-flex align-items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="8" fill="url(#paint0_linear)"/>
            <path d="M11 16L15 20L21 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="1" stopColor="#8B5CF6"/>
              </linearGradient>
            </defs>
          </svg>
          DevCollab
        </span>
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-link text-white text-decoration-none p-0 fw-semibold" onClick={() => navigate('/profile')}>
            Welcome, {user?.name}
          </button>
          <span className="badge" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '6px 10px' }}>{user?.role}</span>
          <NotificationBell />
          <button className="btn-premium-outline py-1 px-3 mt-0" style={{ fontSize: '0.875rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="container mt-5">

        {/* Stats Row */}
        <div className="row mb-5 g-4 animate-in">
          {[
            { label: 'Projects', val: projects.length, color: '#60a5fa', icon: '📁', accent: 'neon-border-blue' },
            { label: 'Total Tasks', val: totalTasks, color: '#34d399', icon: '📝', accent: 'neon-border-cyan' },
            { label: 'Active', val: projects.filter(p => p.status === 'active').length, color: '#fbbf24', icon: '🔥', accent: 'neon-border-purple' },
            { label: 'Archived', val: projects.filter(p => p.status === 'archived').length, color: '#94a3b8', icon: '📦', accent: '' },
          ].map((stat, i) => (
            <div className={`col-md-3 stagger-${i+1}`} key={i}>
              <div className={`glass-panel p-4 d-flex align-items-center justify-content-between h-100 ${stat.accent}`}>
                <div>
                  <p className="mb-1 fw-medium" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{stat.label}</p>
                  <h2 className="fw-bold mb-0" style={{ color: stat.color }}>{stat.val}</h2>
                </div>
                <div style={{ fontSize: '2rem', opacity: 0.9 }}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Projects Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0 text-white">My Projects</h4>
          <button className="btn-premium py-2 px-3" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center mt-5"><div className="spinner-border text-primary" /></div>
        ) : projects.length === 0 ? (
          <div className="text-center py-5 glass-panel">
            <h5 className="text-white mb-2">No projects yet</h5>
            <p style={{ color: 'var(--text-muted)' }}>Create a new project to get started</p>
            <button className="btn-premium mt-3" onClick={() => setShowModal(true)}>+ New Project</button>
          </div>
        ) : (
          <div className="row g-4">
            {projects.map(project => (
              <div className="col-md-4" key={project.id}>
                <div className="glass-panel h-100 p-4 d-flex flex-column text-start" style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${project.id}`)}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="fw-bold mb-0 text-white text-truncate">{project.name}</h5>
                    <span className="badge" style={{ background: project.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: project.status === 'active' ? '#34d399' : '#94a3b8', border: `1px solid ${project.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}` }}>
                      {project.status}
                    </span>
                  </div>
                  <p className="small mb-4" style={{ color: 'var(--text-muted)', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {project.description || 'No description provided.'}
                  </p>
                  <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                    <div className="d-flex justify-content-between small" style={{ color: 'var(--text-muted)' }}>
                      <span>👤 {project.member_count} members</span>
                      <span>📋 {project.task_count} tasks</span>
                    </div>
                    {project.deadline && (
                      <div className="mt-2 small" style={{ color: 'var(--text-muted)' }}>
                        📅 Due: {new Date(project.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Feed */}
        <div className="mt-5 mb-5 pt-4">
          <h5 className="fw-bold mb-4 text-white">📢 Recent Activity</h5>
          <div className="glass-panel p-0 overflow-hidden text-start">
            {activities.length === 0 ? (
              <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>No recent activity</div>
            ) : (
              <div>
                {activities.map((act, i) => (
                  <div key={act.id} className="p-4 d-flex align-items-start gap-4" style={{ borderBottom: i === activities.length - 1 ? 'none' : '1px solid var(--border-glass)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 42, height: 42, fontSize: 16, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontWeight: 600, boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>
                      {act.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="mb-1 text-white" style={{ fontSize: '0.95rem' }}>
                        <span className="fw-semibold text-gradient">{act.user_name}</span>{' '}
                        <span style={{ color: 'var(--text-muted)' }}>{act.action}</span>{' '}
                        <span className="fw-semibold">"{act.details}"</span>
                      </div>
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px' }}>{act.project_name}</span>
                        <small style={{ color: '#64748b' }}>{new Date(act.created_at).toLocaleString()}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered text-start">
            <div className="modal-content glass-panel" style={{ color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div className="modal-header border-0 pb-0" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <h5 className="modal-title fw-bold">Create New Project</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body pt-4">
                  <div className="mb-4">
                    <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Project Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control py-2" placeholder="e.g. NextGen AI Platform" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Description</label>
                    <textarea className="form-control py-2" rows="3" placeholder="What is this project about?" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Deadline</label>
                    <input type="date" className="form-control py-2" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0" style={{ borderTop: '1px solid var(--border-glass)' }}>
                  <button type="button" className="btn-premium-outline py-2" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-premium py-2" disabled={creating}>{creating ? 'Creating...' : 'Create Project'}</button>
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