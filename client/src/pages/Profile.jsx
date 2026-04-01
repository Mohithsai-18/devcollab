import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function Profile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({ projects: 0, tasksDone: 0, inProgress: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      const projects = res.data;
      let tasksDone = 0;
      let inProgress = 0;

      // Fetch tasks for all projects to compute personal stats
      for (const project of projects) {
        try {
          const taskRes = await api.get(`/tasks/project/${project.id}`);
          const myTasks = taskRes.data.filter(t => t.assigned_to === user?.id);
          tasksDone += myTasks.filter(t => t.status === 'done').length;
          inProgress += myTasks.filter(t => t.status === 'in_progress').length;
        } catch { /* skip */ }
      }

      setStats({ projects: projects.length, tasksDone, inProgress });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name });
      login(localStorage.getItem('accessToken'), res.data.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/profile', { name, currentPassword, newPassword });
      setSuccess('Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dark-page-bg">
      {/* Navbar */}
      <nav className="d-flex justify-content-between align-items-center px-4" style={{ height: '72px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn-premium-outline py-1 px-3 mt-0" style={{ fontSize: '0.85rem' }} onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <span className="fw-bold text-white fs-5">My Profile</span>
        </div>
      </nav>

      <div className="container mt-4" style={{ maxWidth: '700px' }}>

        {/* Profile Header Card */}
        <div className="glass-panel mb-4 p-4">
          <div className="d-flex align-items-center gap-4 p-2">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{
                width: '80px', height: '80px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                fontSize: '32px', flexShrink: 0,
                boxShadow: '0 8px 25px rgba(59,130,246,0.3)',
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="fw-bold mb-1 text-white">{user?.name}</h4>
              <p className="mb-1" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
              <span className="badge" style={{
                background: user?.role === 'admin' ? 'rgba(239,68,68,0.2)' : user?.role === 'lead' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                color: user?.role === 'admin' ? '#f87171' : user?.role === 'lead' ? '#fbbf24' : '#60a5fa',
                border: `1px solid ${user?.role === 'admin' ? 'rgba(239,68,68,0.3)' : user?.role === 'lead' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
              }}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="d-flex gap-3 mb-4" style={{ borderBottom: '1px solid var(--border-glass)' }}>
          {[
            { id: 'info', label: '👤 Edit Info' },
            { id: 'password', label: '🔒 Password' },
            { id: 'stats', label: '📊 My Stats' },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
              style={{
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
                padding: '10px 16px', fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: '0.95rem', transition: 'all 0.2s', cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-3 rounded" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
            {success}
          </div>
        )}

        {/* Edit Info Tab */}
        {activeTab === 'info' && (
          <div className="glass-panel p-4">
            <form onSubmit={handleUpdateInfo}>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={user?.email}
                  disabled
                  style={{ opacity: 0.5 }}
                />
                <small style={{ color: '#64748b' }}>Email cannot be changed</small>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Role</label>
                <input
                  type="text"
                  className="form-control"
                  value={user?.role}
                  disabled
                  style={{ opacity: 0.5 }}
                />
                <small style={{ color: '#64748b' }}>Role is assigned by project admin</small>
              </div>
              <button type="submit" className="btn-premium py-2 px-4 mt-0" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <div className="glass-panel p-4">
            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ color: 'var(--text-muted)' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-premium py-2 px-4 mt-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} disabled={saving}>
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="glass-panel p-4">
            <div className="row g-3 text-center mb-4">
              {[
                { label: 'Projects', value: stats.projects, color: '#60a5fa', icon: '📁' },
                { label: 'Tasks Done', value: stats.tasksDone, color: '#34d399', icon: '✅' },
                { label: 'In Progress', value: stats.inProgress, color: '#fbbf24', icon: '🔥' },
              ].map((s, i) => (
                <div className="col-4" key={i}>
                  <div className="glass-panel p-3" style={{ border: `1px solid rgba(255,255,255,0.06)` }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{s.icon}</div>
                    <h3 className="fw-bold mb-0" style={{ color: s.color }}>{s.value}</h3>
                    <small style={{ color: 'var(--text-muted)' }}>{s.label}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
              <div className="d-flex justify-content-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Member since</span>
                <span className="fw-semibold text-white">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span style={{ color: 'var(--text-muted)' }}>Account email</span>
                <span className="fw-semibold text-white">{user?.email}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span style={{ color: 'var(--text-muted)' }}>Role</span>
                <span className="fw-semibold text-white">{user?.role}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;