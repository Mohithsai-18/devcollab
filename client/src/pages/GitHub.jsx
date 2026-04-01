import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import GitHubImportModal from '../components/Common/GitHubImportModal';

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const langColor = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', CSS: '#563d7c',
  HTML: '#e34c26', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', 'C++': '#f34b7d', C: '#555555', Shell: '#89e051',
};

const LangDot = ({ lang }) => (
  lang ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: langColor[lang] || '#8b949e', marginRight: 5, flexShrink: 0 }} /> : null
);

const S = {
  page: { minHeight: '100vh', fontFamily: 'inherit', fontSize: 14, paddingBottom: 40 },
  nav: { background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-glass)', padding: '0 24px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  backBtn: { background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 18, color: 'white' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px' },
  emptyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyTitle: { fontSize: 24, fontWeight: 700, color: 'white' },
  emptySub: { color: 'var(--text-muted)', textAlign: 'center', maxWidth: 450, lineHeight: 1.6 },
  connectBtn: { background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', border: 'none', color: '#fff', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' },
  importBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  repoHeader: { background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-glass)', borderRadius: 16, padding: '24px 32px', marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
  repoTitle: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  repoName: { fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.01em' },
  badge: (color) => ({ background: color === 'green' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${color === 'green' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, color: color === 'green' ? '#34d399' : 'var(--text-muted)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }),
  repoDesc: { color: 'var(--text-muted)', marginBottom: 16, fontSize: 15, lineHeight: 1.6 },
  repoMeta: { display: 'flex', gap: 24, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 6 },
  openBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.2s' },
  disconnectBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },
  tabs: { display: 'flex', marginBottom: 24, borderBottom: '1px solid var(--border-glass)', gap: 8 },
  tab: (active) => ({ background: 'transparent', border: 'none', borderBottom: active ? '2px solid var(--accent-blue)' : '2px solid transparent', color: active ? 'white' : 'var(--text-muted)', padding: '12px 20px', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, fontWeight: active ? 600 : 500, transition: 'all 0.2s' }),
  tabCount: (active) => ({ background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', color: active ? '#60a5fa' : 'var(--text-muted)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }),
  card: { background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-glass)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
  cardHeader: { background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 },
  row: (last) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: last ? 'none' : '1px solid var(--border-glass)', transition: 'background 0.2s' }),
  rowLeft: { display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0, boxShadow: '0 4px 10px rgba(59,130,246,0.3)' },
  commitMsg: { color: '#f8fafc', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 600, background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: 15, transition: 'color 0.2s' },
  sha: { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' },
  branchName: { fontWeight: 600, color: 'white', fontFamily: 'monospace', fontSize: 14 },
  fileName: (isDir) => ({ color: isDir ? '#60a5fa' : 'white', fontWeight: isDir ? 600 : 500, cursor: isDir ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: 15, fontFamily: 'inherit', transition: 'color 0.2s' }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal: { background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' },
  modalHeader: { padding: '24px 32px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: 'white' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: 4, transition: 'color 0.2s' },
  modalBody: { padding: '24px 32px', overflowY: 'auto', flex: 1 },
  modalFooter: { padding: '20px 32px', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' },
  label: { display: 'block', color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' },
  tokenRow: { display: 'flex', gap: 12 },
  input: { flex: 1, background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-glass)', borderRadius: 8, color: 'white', padding: '12px 16px', fontSize: 15, outline: 'none', fontFamily: 'monospace', transition: 'all 0.2s' },
  fetchBtn: (disabled) => ({ background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', border: disabled ? '1px solid var(--border-glass)' : 'none', color: disabled ? 'var(--text-muted)' : 'white', borderRadius: 8, padding: '12px 20px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: disabled ? 'none' : '0 4px 15px rgba(139, 92, 246, 0.4)' }),
  hint: { color: 'var(--text-muted)', fontSize: 13, marginTop: 12, lineHeight: 1.6 },
  link: { color: '#60a5fa', textDecoration: 'none', fontWeight: 500 },
  divider: { border: 'none', borderTop: '1px solid var(--border-glass)', margin: '32px 0' },
  manualRow: { display: 'flex', gap: 12, marginTop: 12 },
  repoListHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  searchInput: { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-glass)', borderRadius: 8, color: 'white', padding: '12px 16px', fontSize: 15, outline: 'none', marginBottom: 16, transition: 'all 0.2s' },
  repoItem: (sel) => ({ background: sel ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${sel ? 'var(--accent-blue)' : 'var(--border-glass)'}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', marginBottom: 12, transition: 'all 0.2s' }),
  repoItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  repoItemName: { fontWeight: 700, color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 },
  repoItemDesc: { color: 'var(--text-muted)', fontSize: 14, marginTop: 6, lineHeight: 1.5 },
  repoItemMeta: { display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  repoMini: { color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 },
  selectedBadge: { background: 'var(--accent-blue)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'white', fontWeight: 600, boxShadow: '0 2px 10px rgba(59,130,246,0.4)' },
  alert: (type) => ({ background: type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, color: type === 'error' ? '#f87171' : '#34d399', borderRadius: 8, padding: '12px 16px', fontSize: 14, marginBottom: 20, fontWeight: 500 }),
  spinner: { width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 },
};

export default function GitHub() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repoInfo, setRepoInfo]       = useState(null);
  const [commits, setCommits]         = useState([]);
  const [branches, setBranches]       = useState([]);
  const [files, setFiles]             = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [connected, setConnected]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('commits');

  // multi-repo switcher
  const [connectedRepos, setConnectedRepos]   = useState([]);
  const [showRepoSwitcher, setShowRepoSwitcher] = useState(false);
  const [switching, setSwitching]             = useState(false);

  // connect modal
  const [showModal, setShowModal]       = useState(false);
  const [step, setStep]                 = useState('token');
  const [tokenInput, setTokenInput]     = useState('');
  const [repos, setRepos]               = useState([]);
  const [repoSearch, setRepoSearch]     = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [manualOwner, setManualOwner]   = useState('');
  const [manualName, setManualName]     = useState('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting]     = useState(false);
  const [error, setError]               = useState('');

  // import modal
  const [showImport, setShowImport]       = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  const tokenRef = useRef(null);

  const loadConnectedRepos = useCallback(async () => {
    try {
      const res = await api.get(`/github/repos/connected/${id}`);
      setConnectedRepos(res.data);
    } catch {}
  }, [id]);

  const loadCommits  = useCallback(async () => { try { const r = await api.get(`/github/commits/${id}`);  setCommits(r.data);  } catch {} }, [id]);
  const loadBranches = useCallback(async () => { try { const r = await api.get(`/github/branches/${id}`); setBranches(r.data); } catch {} }, [id]);
  const loadFiles    = useCallback(async (path) => {
    try {
      const r = await api.get(`/github/files/${id}?path=${encodeURIComponent(path)}`);
      setFiles(r.data); setCurrentPath(path);
    } catch {}
  }, [id]);

  const loadRepo = useCallback(async () => {
    try {
      const res = await api.get(`/github/repo/${id}`);
      setRepoInfo(res.data);
      setConnected(true);
      await Promise.all([loadCommits(), loadBranches(), loadFiles(''), loadConnectedRepos()]);
    } catch { setConnected(false); }
    finally { setLoading(false); }
  }, [id, loadCommits, loadBranches, loadFiles, loadConnectedRepos]);

  useEffect(() => { loadRepo(); }, [id, loadRepo]);

  useEffect(() => {
    if (showModal) {
      setError(''); setStep('token'); setSelectedRepo(null); setRepoSearch('');
      const saved = localStorage.getItem('gh_token');
      if (saved) { setTokenInput(saved); fetchRepos(saved); }
      else setTimeout(() => tokenRef.current?.focus(), 100);
    }
  }, [showModal]); // eslint-disable-line

  const fetchRepos = async (token) => {
    if (!token) return;
    setLoadingRepos(true); setError('');
    try {
      const res = await api.get('/github/repos', { headers: { 'x-github-token': token } });
      setRepos(res.data); localStorage.setItem('gh_token', token); setStep('list');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch repos — check your token');
    } finally { setLoadingRepos(false); }
  };

  const handleConnect = async () => {
    const owner = selectedRepo ? selectedRepo.owner : manualOwner.trim();
    const name  = selectedRepo ? selectedRepo.name  : manualName.trim();
    if (!owner || !name) return;
    setConnecting(true); setError('');
    try {
      await api.post('/github/connect', { project_id: id, repo_owner: owner, repo_name: name, github_token: tokenInput || null });
      setShowModal(false); setLoading(true); loadRepo();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect repository');
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect the active repository?')) return;
    try {
      await api.delete(`/github/disconnect/${id}`);
      loadRepo();
    } catch {}
  };

  const handleSwitchRepo = async (repo) => {
    setSwitching(true);
    try {
      await api.patch(`/github/switch/${repo.id}`, { project_id: id });
      setShowRepoSwitcher(false);
      setLoading(true);
      loadRepo();
    } catch {}
    finally { setSwitching(false); }
  };

  const handleImported = (created) => {
    setImportSuccess(`✅ ${created.length} tasks imported to Kanban!`);
    setTimeout(() => setImportSuccess(''), 4000);
  };

  const openUrl = (url) => window.open(url, '_blank', 'noreferrer');

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(repoSearch.toLowerCase())
  );
  const canConnect = selectedRepo || (manualOwner.trim() && manualName.trim());

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={S.spinner} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="dark-page-bg" style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <button style={S.backBtn} onClick={() => navigate(`/project/${id}`)}>← Back</button>
          <div style={S.logo}>
            <svg height="20" viewBox="0 0 16 16" fill="#e6edf3">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub Integration
          </div>
        </div>
        <div style={S.navRight}>
          {connected && (
            <button style={S.importBtn} onClick={() => setShowImport(true)}>
              <svg height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/>
              </svg>
              Import as tasks
            </button>
          )}
          {connected && (
            <button style={S.disconnectBtn} onClick={handleDisconnect}>Disconnect</button>
          )}
        </div>
      </nav>

      <div style={S.container}>

        {/* Import success toast */}
        {importSuccess && (
          <div style={{ background: '#0a1a0a', border: '1px solid #238636', color: '#3fb950', borderRadius: 8, padding: '12px 18px', marginBottom: 20, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            {importSuccess}
            <button onClick={() => navigate(`/project/${id}`)} style={{ marginLeft: 'auto', background: '#238636', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>
              View Kanban →
            </button>
          </div>
        )}

        {!connected ? (
          <div style={S.emptyWrap} className="animate-in stagger-1">
            <svg height="64" viewBox="0 0 16 16" fill="#30363d">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <div style={S.emptyTitle}>Connect a GitHub Repository</div>
            <div style={S.emptySub}>Import a repository to view commits, branches, and files directly inside DevCollab.</div>
            <button style={S.connectBtn} onClick={() => setShowModal(true)}>
              <svg height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Connect Repository
            </button>
          </div>
        ) : (
          <>
            {/* Repo header */}
            <div className="glass-panel p-4 mb-4 animate-in stagger-1">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={S.repoTitle}>
                    <svg height="18" viewBox="0 0 16 16" fill="#58a6ff" style={{ flexShrink: 0 }}>
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    <span style={S.repoName}>{repoInfo?.full_name}</span>
                    <span style={S.badge(repoInfo?.visibility === 'public' ? 'green' : 'gray')}>{repoInfo?.visibility}</span>
                    {repoInfo?.language && <span style={S.badge('gray')}><LangDot lang={repoInfo.language} />{repoInfo.language}</span>}
                  </div>
                  {repoInfo?.description && <div style={S.repoDesc}>{repoInfo.description}</div>}
                  <div style={S.repoMeta}>
                    <span style={S.metaItem}>⭐ {repoInfo?.stars?.toLocaleString()}</span>
                    <span style={S.metaItem}>🍴 {repoInfo?.forks?.toLocaleString()}</span>
                    <span style={S.metaItem}>⚠️ {repoInfo?.open_issues} issues</span>
                    <span style={S.metaItem}>🌿 {repoInfo?.default_branch}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button style={S.importBtn} onClick={() => setShowImport(true)}>
                    <svg height="13" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/>
                    </svg>
                    Import as tasks
                  </button>
                  <button style={S.openBtn} onClick={() => openUrl(repoInfo?.html_url)}>View on GitHub ↗</button>
                </div>
              </div>
            </div>

            {/* ── Premium Multi-repo switcher ── */}
            <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg height="20" viewBox="0 0 16 16" fill="#3b82f6"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'white' }}>Repository Switching</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {connectedRepos.length} repository connections available for this project
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setShowRepoSwitcher(!showRepoSwitcher)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}>
                    🔀 {showRepoSwitcher ? 'Hide Switcher' : 'Switch Repository'}
                  </button>
                  <button onClick={() => setShowModal(true)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}>
                    + Connect Another
                  </button>
                </div>
              </div>

              {/* Repo list dropdown */}
              {showRepoSwitcher && connectedRepos.length > 0 && (
                <div style={{ marginTop: 20, borderTop: '1px solid var(--border-glass)', paddingTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {connectedRepos.map(repo => (
                    <div key={repo.id} style={{
                      display: 'flex', flexDirection: 'column', padding: '16px', borderRadius: 12,
                      background: repo.is_active ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${repo.is_active ? 'var(--accent-blue)' : 'var(--border-glass)'}`,
                      transition: 'all 0.2s', position: 'relative'
                    }}>
                      <div style={{ color: 'white', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <svg height="16" viewBox="0 0 16 16" fill={repo.is_active ? '#60a5fa' : 'var(--text-muted)'}>
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        {repo.repo_owner}/{repo.repo_name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
                        Connected: {new Date(repo.connected_at).toLocaleDateString()}
                      </div>
                      
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                        {repo.is_active ? (
                          <span style={{ background: 'var(--accent-blue)', color: 'white', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✓ Active Repository
                          </span>
                        ) : (
                          <button
                            disabled={switching}
                            onClick={() => handleSwitchRepo(repo)}
                            className="btn-premium"
                            style={{ padding: '6px 16px', fontSize: 13, width: '100%' }}
                          >
                            {switching ? <div style={S.spinner} /> : 'Switch to this repo →'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={S.tabs} className="animate-in stagger-2">
              {[
                { key: 'commits',  label: 'Commits',  count: commits.length,  icon: '⏱' },
                { key: 'branches', label: 'Branches', count: branches.length, icon: '🌿' },
                { key: 'files',    label: 'Files',    count: null,            icon: '📁' },
              ].map(t => (
                <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
                  {t.icon} {t.label}
                  {t.count !== null && <span style={S.tabCount(activeTab === t.key)}>{t.count}</span>}
                </button>
              ))}
            </div>

            {/* Commits */}
            {activeTab === 'commits' && (
              <div className="glass-panel animate-in stagger-3">
                {commits.length === 0
                  ? <div style={{ padding: 40, textAlign: 'center', color: '#8b949e' }}>No commits found</div>
                  : commits.map((c, i) => (
                    <div key={c.sha} style={{ ...S.row(i === commits.length - 1), gap: 12 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={S.rowLeft}>
                        <div style={S.avatar}>{c.author?.[0]?.toUpperCase() || '?'}</div>
                        <div style={{ minWidth: 0 }}>
                          <button style={S.commitMsg} onClick={() => openUrl(c.url)} title={c.message}>{c.message}</button>
                          <div style={{ color: '#8b949e', fontSize: 12, marginTop: 3 }}>{c.author} · {timeAgo(c.date)}</div>
                        </div>
                      </div>
                      <span style={S.sha}>{c.sha}</span>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Branches */}
            {activeTab === 'branches' && (
              <div className="glass-panel animate-in stagger-3">
                {branches.map((b, i) => (
                  <div key={b.name} style={S.row(i === branches.length - 1)}
                    onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={S.rowLeft}>
                      <svg height="16" viewBox="0 0 16 16" fill="#3fb950" style={{ flexShrink: 0 }}>
                        <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 019 8.5H7.5a1 1 0 000 2h2a.75.75 0 010 1.5h-2a2.5 2.5 0 010-5H9a1 1 0 000-2H6.823A2.251 2.251 0 114.25 3.25v.006a.75.75 0 001.5 0v-.006A.75.75 0 016.5 3a.75.75 0 10-1.5 0 2.25 2.25 0 002.25 2.25H9a2.5 2.5 0 012.5 2.5v.872a2.25 2.25 0 11-1.5 0V7.75A1 1 0 009 6.75H7.5A2.5 2.5 0 015 4.25V4.13A2.251 2.251 0 114.25 2a2.25 2.25 0 012.25 2.25v.117z"/>
                      </svg>
                      <span style={S.branchName}>{b.name}</span>
                      {b.name === repoInfo?.default_branch && <span style={S.badge('green')}>default</span>}
                    </div>
                    <span style={S.sha}>{b.sha}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Files */}
            {activeTab === 'files' && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  {pathHistory.length > 0 && (
                    <button style={{ ...S.openBtn, padding: '4px 10px', fontSize: 12 }} onClick={() => {
                      const prev = pathHistory[pathHistory.length - 1];
                      setPathHistory(p => p.slice(0, -1));
                      loadFiles(prev || '');
                    }}>← Back</button>
                  )}
                  <span style={{ color: '#8b949e', fontSize: 12, fontFamily: 'monospace' }}>/ {currentPath || 'root'}</span>
                </div>
                {files.map((f, i) => (
                  <div key={f.path} style={S.row(i === files.length - 1)}
                    onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => f.type === 'dir' && (setPathHistory(p => [...p, currentPath]), loadFiles(f.path))}
                  >
                    <div style={S.rowLeft}>
                      {f.type === 'dir'
                        ? <svg height="16" viewBox="0 0 16 16" fill="#8b949e"><path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/></svg>
                        : <svg height="16" viewBox="0 0 16 16" fill="#8b949e"><path d="M3.75 1.5a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25V1.75z"/></svg>
                      }
                      <button style={S.fileName(f.type === 'dir')}>{f.name}</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {f.size > 0 && <span style={{ color: '#8b949e', fontSize: 12 }}>{fmtSize(f.size)}</span>}
                      {f.type === 'file' && (
                        <button style={{ ...S.openBtn, padding: '3px 10px', fontSize: 12 }}
                          onClick={e => { e.stopPropagation(); openUrl(f.url); }}>View ↗</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Connect Modal */}
      {showModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalTitle}>{step === 'token' ? 'Connect a Git Repository' : 'Select a repository'}</div>
              <button style={S.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={S.modalBody}>
              {error && <div style={S.alert('error')}>{error}</div>}
              {step === 'token' && (
                <>
                  <label style={S.label}>GITHUB PERSONAL ACCESS TOKEN</label>
                  <div style={S.tokenRow}>
                    <input ref={tokenRef} type="password" style={S.input}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value={tokenInput}
                      onChange={e => setTokenInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchRepos(tokenInput)} />
                    <button style={S.fetchBtn(!tokenInput || loadingRepos)}
                      disabled={!tokenInput || loadingRepos} onClick={() => fetchRepos(tokenInput)}>
                      {loadingRepos
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={S.spinner} /> Loading...</span>
                        : 'Continue →'}
                    </button>
                  </div>
                  <div style={S.hint}>
                    Generate at: <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" style={S.link}>
                      GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
                    </a>
                    <br />Required scope: <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 4 }}>repo</code>
                  </div>
                  <hr style={S.divider} />
                  <div style={{ color: '#8b949e', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>OR CONNECT MANUALLY</div>
                  <div style={S.manualRow}>
                    <input style={{ ...S.input, fontFamily: 'inherit' }} placeholder="Owner (e.g. Mohithsai-18)"
                      value={manualOwner} onChange={e => setManualOwner(e.target.value)} />
                    <input style={{ ...S.input, fontFamily: 'inherit' }} placeholder="Repo name (e.g. devcollab)"
                      value={manualName} onChange={e => setManualName(e.target.value)} />
                  </div>
                </>
              )}
              {step === 'list' && (
                <>
                  <div style={S.repoListHeader}>
                    <span style={{ color: '#8b949e', fontSize: 13 }}>{filteredRepos.length} of {repos.length} repositories</span>
                    <button style={{ ...S.openBtn, fontSize: 12, padding: '4px 10px' }}
                      onClick={() => { setStep('token'); setRepos([]); setSelectedRepo(null); localStorage.removeItem('gh_token'); }}>
                      ← Change token
                    </button>
                  </div>
                  <input style={S.searchInput} placeholder="Search repositories..."
                    value={repoSearch} onChange={e => setRepoSearch(e.target.value)} autoFocus />
                  <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {filteredRepos.map(r => (
                      <div key={r.full_name} style={S.repoItem(selectedRepo?.full_name === r.full_name)}
                        onClick={() => setSelectedRepo(r)}>
                        <div style={S.repoItemTop}>
                          <div style={S.repoItemName}>
                            {r.private
                              ? <svg height="14" viewBox="0 0 16 16" fill="#8b949e"><path d="M4 4a4 4 0 018 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25v-5.5C2 6.784 2.784 6 3.75 6H4V4zm6.5 2V4a2.5 2.5 0 00-5 0v2h5z"/></svg>
                              : <svg height="14" viewBox="0 0 16 16" fill="#3fb950"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
                            }
                            {r.name}
                          </div>
                          {selectedRepo?.full_name === r.full_name && <span style={S.selectedBadge}>✓ Selected</span>}
                        </div>
                        {r.description && <div style={S.repoItemDesc}>{r.description}</div>}
                        <div style={S.repoItemMeta}>
                          {r.language && <span style={S.repoMini}><LangDot lang={r.language} />{r.language}</span>}
                          <span style={S.repoMini}>⭐ {r.stars}</span>
                          <span style={S.repoMini}>Updated {timeAgo(r.updated_at)}</span>
                          {r.fork && <span style={S.repoMini}>🍴 Fork</span>}
                        </div>
                      </div>
                    ))}
                    {filteredRepos.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#8b949e', padding: 32 }}>No repositories match "{repoSearch}"</div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={S.modalFooter}>
              <span style={{ color: '#8b949e', fontSize: 12 }}>
                {selectedRepo ? selectedRepo.full_name : manualOwner && manualName ? `${manualOwner}/${manualName}` : 'No repository selected'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...S.openBtn }} onClick={() => setShowModal(false)}>Cancel</button>
                <button style={S.fetchBtn(!canConnect || connecting)} disabled={!canConnect || connecting} onClick={handleConnect}>
                  {connecting
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={S.spinner} /> Connecting...</span>
                    : 'Connect Repository'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <GitHubImportModal
          projectId={id}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}