import { useState } from 'react';
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
    <div className="min-vh-100 bg-light">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-primary px-4">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <span className="navbar-brand fw-bold mb-0">My Profile</span>
        </div>
      </nav>

      <div className="container mt-4" style={{ maxWidth: '700px' }}>

        {/* Profile Header Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body d-flex align-items-center gap-4 p-4">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{
                width: '80px', height: '80px',
                backgroundColor: `hsl(${user?.id * 47 % 360}, 60%, 50%)`,
                fontSize: '32px', flexShrink: 0
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="fw-bold mb-1">{user?.name}</h4>
              <p className="text-muted mb-1">{user?.email}</p>
              <span className={`badge bg-${user?.role === 'admin' ? 'danger' : user?.role === 'lead' ? 'warning' : user?.role === 'reviewer' ? 'info' : 'primary'}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => { setActiveTab('info'); setError(''); setSuccess(''); }}
            >
              👤 Edit Info
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
            >
              🔒 Change Password
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => { setActiveTab('stats'); setError(''); setSuccess(''); }}
            >
              📊 My Stats
            </button>
          </li>
        </ul>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Edit Info Tab */}
        {activeTab === 'info' && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleUpdateInfo}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={user?.email}
                    disabled
                  />
                  <small className="text-muted">Email cannot be changed</small>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Role</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={user?.role}
                    disabled
                  />
                  <small className="text-muted">Role is assigned by project admin</small>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Current Password</label>
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
                  <label className="form-label fw-semibold">New Password</label>
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
                  <label className="form-label fw-semibold">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-warning" disabled={saving}>
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="row text-center">
                <div className="col-4">
                  <div className="card border-0 bg-primary bg-opacity-10 p-3">
                    <h3 className="text-primary fw-bold">—</h3>
                    <small className="text-muted">Projects</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="card border-0 bg-success bg-opacity-10 p-3">
                    <h3 className="text-success fw-bold">—</h3>
                    <small className="text-muted">Tasks Done</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="card border-0 bg-warning bg-opacity-10 p-3">
                    <h3 className="text-warning fw-bold">—</h3>
                    <small className="text-muted">In Progress</small>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-light rounded">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Member since</span>
                  <span className="fw-semibold">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Account email</span>
                  <span className="fw-semibold">{user?.email}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Role</span>
                  <span className="fw-semibold">{user?.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;