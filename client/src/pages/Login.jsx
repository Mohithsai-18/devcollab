import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', formData);
      login(res.data.accessToken, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark-page-bg d-flex align-items-center justify-content-center">
      <div className="glass-panel p-5 animate-in" style={{ width: '420px', border: '1px solid var(--border-glass)' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-white">DevCollab</h2>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-premium w-100 py-2 mt-0"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <hr style={{ borderColor: 'var(--border-glass)' }} />
        <button
          className="btn-premium-outline w-100 py-2 mb-3"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/github`}
        >
          <svg height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          Continue with GitHub
        </button>

        <p className="text-center mt-3 mb-0">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary fw-semibold">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;