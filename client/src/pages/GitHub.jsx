import { useState, useEffect, useRef } from 'react';
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
  page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14 },
  nav: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  navLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  navRight: { display: 'flex', alignItems: 'center', gap: 8 },
  backBtn: { background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 },
  logo: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 },
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  emptyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 600, color: '#e6edf3' },
  emptySub: { color: '#8b949e', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 },
  connectBtn: { background: '#238636', border: '1px solid #2ea043', color: '#fff', borderRadius: 6, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  importBtn: { background: '#1f6feb', border: '1px solid #388bfd', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 },
  repoHeader: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 16 },
  repoTitle: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  repoName: { fontSize: 20, fontWeight: 600, color: '#58a6ff' },
  badge: (color) => ({ background: color === 'green' ? '#1a3a2a' : '#21262d', border: `1px solid ${color === 'green' ? '#238636' : '#30363d'}`, color: color === 'green' ? '#3fb950' : '#8b949e', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 500 }),
  repoDesc: { color: '#8b949e', marginBottom: 12, fontSize: 14, lineHeight: 1.5 },
  repoMeta: { display: 'flex', gap: 20, flexWrap: 'wrap', color: '#8b949e', fontSize: 13 },
  metaItem: { display: 'flex', alignItems: 'center', gap: 5 },
  openBtn: { background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
  disconnectBtn: { background: 'transparent', border: '1px solid #f85149', color: '#f85149', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  tabs: { display: 'flex', marginBottom: 20, borderBottom: '1px solid #30363d' },
  tab: (active) => ({ background: 'transparent', border: 'none', borderBottom: active ? '2px solid #f78166' : '2px solid transparent', color: active ? '#e6edf3' : '#8b949e', padding: '10px 16px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, fontWeight: active ? 500 : 400 }),
  tabCount: (active) => ({ background: active ? '#30363d' : '#21262d', borderRadius: 20, padding: '1px 8px', fontSize: 12 }),
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  row: (last) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: last ? 'none' : '1px solid #21262d', transition: 'background .1s' }),
  rowLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: '#21262d', border: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0, color: '#8b949e' },
  commitMsg: { color: '#58a6ff', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 500, background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: 14 },
  sha: { background: '#21262d', border: '1px solid #30363d', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: '#8b949e', fontFamily: 'monospace' },
  branchName: { fontWeight: 500, color: '#e6edf3', fontFamily: 'monospace', fontSize: 13 },
  fileName: (isDir) => ({ color: isDir ? '#58a6ff' : '#e6edf3', fontWeight: isDir ? 500 : 400, cursor: isDir ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0, textAlign: 'left', fontSize: 14, fontFamily: isDir ? 'inherit' : 'monospace' }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: '#161b22', border: '1px solid #30363d', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px 16px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: 600, color: '#e6edf3' },
  closeBtn: { background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 },
  modalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  label: { display: 'block', color: '#8b949e', fontSize: 12, marginBottom: 6, fontWeight: 500 },
  tokenRow: { display: 'flex', gap: 8 },
  input: { flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'monospace' },
  fetchBtn: (disabled) => ({ background: disabled ? '#21262d' : '#238636', border: `1px solid ${disabled ? '#30363d' : '#2ea043'}`, color: disabled ? '#484f58' : '#fff', borderRadius: 6, padding: '8px 16px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }),
  hint: { color: '#8b949e', fontSize: 12, marginTop: 8, lineHeight: 1.6 },
  link: { color: '#58a6ff', textDecoration: 'none' },
  divider: { border: 'none', borderTop: '1px solid #30363d', margin: '20px 0' },
  manualRow: { display: 'flex', gap: 8, marginTop: 8 },
  repoListHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  searchInput: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 14, outline: 'none', marginBottom: 12 },
  repoItem: (sel) => ({ background: sel ? '#1c2d3a' : '#0d1117', border: `1px solid ${sel ? '#1f6feb' : '#30363d'}`, borderRadius: 8, padding: '14px 16px', cursor: 'pointer', marginBottom: 8 }),
  repoItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  repoItemName: { fontWeight: 600, color: '#e6edf3', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 },
  repoItemDesc: { color: '#8b949e', fontSize: 12, marginTop: 4, lineHeight: 1.5 },
  repoItemMeta: { display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  repoMini: { color: '#8b949e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 },
  selectedBadge: { background: '#1f6feb', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: '#fff', fontWeight: 500 },
  alert: (type) => ({ background: type === 'error' ? '#1a0a0a' : '#0a1a0a', border: `1px solid ${type === 'error' ? '#f85149' : '#238636'}`, color: type === 'error' ? '#f85149' : '#3fb950', borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 16 }),
  spinner: { width: 18, height: 18, border: '2px solid #30363d', borderTop: '2px solid #58a6ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 },
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

  useEffect(() => { loadRepo(); }, [id]); // eslint-disable-line

  useEffect(() => {
    if (showModal) {
      setError(''); setStep('token'); setSelectedRepo(null); setRepoSearch('');
      const saved = localStorage.getItem('gh_token');
      if (saved) { setTokenInput(saved); fetchRepos(saved); }
      else setTimeout(() => tokenRef.current?.focus(), 100);
    }
  }, [showModal]); // eslint-disable-line

  const loadRepo = async () => {
    try {
      const res = await api.get(`/github/repo/${id}`);
      setRepoInfo(res.data);
      setConnected(true);
      await Promise.all([loadCommits(), loadBranches(), loadFiles(''), loadConnectedRepos()]);
    } catch { setConnected(false); }
    finally { setLoading(false); }
  };

  const loadConnectedRepos = async () => {
    try {
      const res = await api.get(`/github/repos/connected/${id}`);
      setConnectedRepos(res.data);
    } catch {}
  };

  const loadCommits  = async () => { try { const r = await api.get(`/github/commits/${id}`);  setCommits(r.data);  } catch {} };
  const loadBranches = async () => { try { const r = await api.get(`/github/branches/${id}`); setBranches(r.data); } catch {} };
  const loadFiles    = async (path) => {
    try {
      const r = await api.get(`/github/files/${id}?path=${encodeURIComponent(path)}`);
      setFiles(r.data); setCurrentPath(path);
    } catch {}
  };

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
    <div style={S.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.85; }
        input:focus { border-color: #58a6ff !important; box-shadow: 0 0 0 3px rgba(88,166,255,0.15); }
        ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
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
          <div style={S.emptyWrap}>
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
            <div style={S.repoHeader}>
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

            {/* ── Multi-repo switcher ── */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#8b949e' }}>
                  <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                    {connectedRepos.length} repo{connectedRepos.length !== 1 ? 's' : ''} connected
                  </span>
                  {' · '}active:{' '}
                  <code style={{ color: '#58a6ff', background: '#21262d', padding: '1px 6px', borderRadius: 4 }}>
                    {repoInfo?.full_name}
                  </code>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowRepoSwitcher(!showRepoSwitcher)}
                    style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}
                  >
                    🔀 {showRepoSwitcher ? 'Hide' : 'Switch Repo'}
                  </button>
                  <button
                    onClick={() => setShowModal(true)}
                    style={{ background: 'transparent', border: '1px solid #238636', color: '#3fb950', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}
                  >
                    + Connect another
                  </button>
                </div>
              </div>

              {/* Repo list */}
              {showRepoSwitcher && connectedRepos.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #21262d', paddingTop: 12 }}>
                  {connectedRepos.map(repo => (
                    <div key={repo.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', marginBottom: 6, borderRadius: 6,
                      background: repo.is_active ? '#1c2d3a' : '#0d1117',
                      border: `1px solid ${repo.is_active ? '#1f6feb' : '#30363d'}`,
                    }}>
                      <div>
                        <div style={{ color: '#e6edf3', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg height="14" viewBox="0 0 16 16" fill="#8b949e">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                          </svg>
                          {repo.repo_owner}/{repo.repo_name}
                          {repo.is_active === 1 && (
                            <span style={{ background: '#1f6feb', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10 }}>Active</span>
                          )}
                        </div>
                        <div style={{ color: '#8b949e', fontSize: 11, marginTop: 2 }}>
                          Connected {new Date(repo.connected_at).toLocaleDateString()}
                        </div>
                      </div>
                      {!repo.is_active && (
                        <button
                          disabled={switching}
                          onClick={() => handleSwitchRepo(repo)}
                          style={{ background: '#238636', border: '1px solid #2ea043', color: '#fff', borderRadius: 6, padding: '5px 14px', cursor: switching ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500 }}
                        >
                          {switching ? '...' : 'Switch →'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={S.tabs}>
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
              <div style={S.card}>
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
              <div style={S.card}>
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