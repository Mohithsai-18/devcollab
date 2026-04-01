import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function ImportFromGitHub() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');
  const [imported, setImported] = useState([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
      setTokenInput(savedToken);
      fetchRepos(savedToken);
    }
  }, []);

  useEffect(() => {
    let filtered = repos;
    if (search) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (filterType === 'public') filtered = filtered.filter(r => !r.private);
    if (filterType === 'private') filtered = filtered.filter(r => r.private);
    setFilteredRepos(filtered);
  }, [search, filterType, repos]);

  const fetchRepos = async (t) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/github/repos?token=${t}`);
      setRepos(res.data);
      setFilteredRepos(res.data);
      localStorage.setItem('github_token', t);
      setToken(t);
    } catch (err) {
      setError('Failed to fetch repositories. Check your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (repo) => {
    setImporting(repo.full_name);
    try {
      // Create project from repo
      const projectRes = await api.post('/projects', {
        name: repo.name,
        description: repo.description || `Imported from GitHub: ${repo.full_name}`,
        deadline: null
      });

      const projectId = projectRes.data.projectId;

      // Connect repo to project
      await api.post('/github/connect', {
        project_id: projectId,
        repo_owner: repo.owner,
        repo_name: repo.name,
        github_token: token
      });

      setImported(prev => [...prev, repo.full_name]);
    } catch (err) {
      setError(`Failed to import ${repo.name}: ${err.response?.data?.message || 'Server error'}`);
    } finally {
      setImporting(null);
    }
  };

  const getLanguageColor = (lang) => {
    const colors = {
      JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
      Java: '#b07219', 'C++': '#f34b7d', C: '#555555', Go: '#00ADD8',
      Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
      Kotlin: '#A97BFF', Dart: '#00B4AB', CSS: '#563d7c', HTML: '#e34c26'
    };
    return colors[lang] || '#8b949e';
  };

  return (
    <div className="dark-page-bg">

      {/* Navbar */}
      <nav className="d-flex justify-content-between align-items-center px-4" style={{ height: '72px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn-premium-outline py-1 px-3 mt-0" style={{ fontSize: '0.85rem' }} onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <span className="fw-bold text-white fs-5">
            🐙 Import from GitHub
          </span>
        </div>
        {imported.length > 0 && (
          <button className="btn btn-success btn-sm mt-0" onClick={() => navigate('/dashboard')}>
            ✓ {imported.length} imported — Go to Dashboard
          </button>
        )}
      </nav>

      <div className="container mt-4" style={{ maxWidth: '900px' }}>

        {/* Token Section */}
        {repos.length === 0 ? (
          <div className="glass-panel p-5 mb-4 border-0">
            <div className="text-center mb-4">
              <div style={{ fontSize: '50px' }}>🐙</div>
              <h4 className="fw-bold mt-2">Import GitHub Repositories</h4>
              <p className="text-muted">
                Connect your GitHub account to import repositories as DevCollab projects.
              </p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="mb-3">
              <label className="form-label fw-semibold">GitHub Personal Access Token</label>
              <div className="input-group">
                <input
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchRepos(tokenInput)}
                />
                <button
                  className="btn btn-dark btn-lg"
                  onClick={() => fetchRepos(tokenInput)}
                  disabled={loading || !tokenInput}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : 'Connect'}
                </button>
              </div>
              <small className="text-muted">
                Generate at: GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → check <strong>repo</strong> scope
              </small>
            </div>

            <div className="card bg-light border-0 p-3">
              <h6 className="fw-bold mb-2">What happens when you import?</h6>
              <div className="d-flex gap-2 mb-1">
                <span>✅</span>
                <span className="small">A new DevCollab project is created with the repo name</span>
              </div>
              <div className="d-flex gap-2 mb-1">
                <span>✅</span>
                <span className="small">The GitHub repo is linked — see commits, branches and files</span>
              </div>
              <div className="d-flex gap-2 mb-1">
                <span>✅</span>
                <span className="small">You can add team members, tasks and sprints to the project</span>
              </div>
              <div className="d-flex gap-2">
                <span>✅</span>
                <span className="small">Import as many repos as you want</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {error && <div className="alert alert-danger mb-3">{error}</div>}

            {/* Stats bar */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex gap-3">
                <span className="badge bg-dark fs-6">{repos.length} repositories</span>
                <span className="badge bg-success fs-6">{repos.filter(r => !r.private).length} public</span>
                <span className="badge bg-secondary fs-6">{repos.filter(r => r.private).length} private</span>
                {imported.length > 0 && (
                  <span className="badge bg-primary fs-6">{imported.length} imported</span>
                )}
              </div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => { setRepos([]); setFilteredRepos([]); localStorage.removeItem('github_token'); setTokenInput(''); }}
              >
                Change Token
              </button>
            </div>

            {/* Search and Filter */}
            <div className="glass-panel p-3 mb-3 border-0">
              <div className="row g-2">
                <div className="col-md-8">
                  <div className="input-group">
                    <span className="input-group-text bg-white">🔍</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search repositories..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                      <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>✕</button>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                  >
                    <option value="all">All Repositories</option>
                    <option value="public">Public Only</option>
                    <option value="private">Private Only</option>
                  </select>
                </div>
              </div>
              {search && (
                <small className="text-muted mt-2 d-block">
                  Showing {filteredRepos.length} of {repos.length} repositories
                </small>
              )}
            </div>

            {/* Repo List */}
            <div className="glass-panel p-0 overflow-hidden border-0">
              <div className="card-body p-0">
                {filteredRepos.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p>No repositories found matching "{search}"</p>
                  </div>
                ) : (
                  filteredRepos.map((repo, i) => {
                    const isImported = imported.includes(repo.full_name);
                    const isImporting = importing === repo.full_name;
                    return (
                      <div
                        key={repo.full_name}
                        className={`d-flex align-items-center justify-content-between p-4 ${i !== filteredRepos.length - 1 ? 'border-bottom' : ''} ${isImported ? 'bg-success bg-opacity-10' : ''}`}
                        style={{ borderColor: 'var(--border-glass) !important' }}
                      >
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span style={{ fontSize: '18px' }}>{repo.private ? '🔒' : '🌐'}</span>
                            <h6 className="mb-0 fw-bold">{repo.name}</h6>
                            {repo.private && (
                              <span className="badge bg-secondary" style={{ fontSize: '10px' }}>Private</span>
                            )}
                            {isImported && (
                              <span className="badge bg-success" style={{ fontSize: '10px' }}>✓ Imported</span>
                            )}
                          </div>
                          <p className="text-muted small mb-2">
                            {repo.description || 'No description'}
                          </p>
                          <div className="d-flex gap-3 align-items-center">
                            {repo.language && (
                              <span className="d-flex align-items-center gap-1 small text-muted">
                                <span
                                  className="rounded-circle"
                                  style={{
                                    width: '10px', height: '10px',
                                    backgroundColor: getLanguageColor(repo.language),
                                    display: 'inline-block'
                                  }}
                                />
                                {repo.language}
                              </span>
                            )}
                            <span className="small text-muted">⭐ {repo.stars}</span>
                            <span className="small text-muted">
                              Updated {new Date(repo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="ms-3">
                          {isImported ? (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => navigate('/dashboard')}
                            >
                              View Project →
                            </button>
                          ) : (
                            <button
                              className="btn btn-dark btn-sm"
                              onClick={() => handleImport(repo)}
                              disabled={isImporting}
                            >
                              {isImporting ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  Importing...
                                </>
                              ) : 'Import'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default ImportFromGitHub;