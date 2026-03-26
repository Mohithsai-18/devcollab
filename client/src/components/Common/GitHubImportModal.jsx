import { useState, useEffect } from 'react';
import api from '../../utils/api';

const EXT_COLORS = {
  js: '#f1e05a', jsx: '#61dafb', ts: '#3178c6', tsx: '#3178c6',
  py: '#3572a5', java: '#b07219', go: '#00add8', rs: '#dea584',
  css: '#563d7c', scss: '#c6538c', html: '#e34c26', json: '#292929',
  md: '#083fa1', yml: '#cb171e', yaml: '#cb171e', sh: '#89e051',
  sql: '#e38c00', php: '#4f5d95', rb: '#701516', vue: '#41b883',
};
const extColor = (name) => {
  const ext = name.split('.').pop()?.toLowerCase();
  return EXT_COLORS[ext] || '#8b949e';
};
const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  return `${(b / 1024).toFixed(1)} KB`;
};

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog' },
  { id: 'todo',        label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review',   label: 'In Review' },
  { id: 'done',        label: 'Done' },
];

export default function GitHubImportModal({ projectId, onClose, onImported }) {
  const [contents, setContents]         = useState([]);
  const [pathStack, setPathStack]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState({});
  const [targetStatus, setTargetStatus] = useState('backlog');
  const [importing, setImporting]       = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [repoConnected, setRepoConnected] = useState(true);

  const currentPath = pathStack[pathStack.length - 1] ?? '';

  useEffect(() => { loadFolder(''); }, [projectId]);

  const loadFolder = async (path) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/github/folder/${projectId}?path=${encodeURIComponent(path)}`);
      setContents(res.data.files);
    } catch (err) {
      if (err.response?.status === 404) setRepoConnected(false);
      else setError('Failed to load folder');
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (dirPath) => {
    setPathStack(prev => [...prev, dirPath]);
    setContents([]);
    loadFolder(dirPath);
  };

  const goBack = () => {
    const newStack = pathStack.slice(0, -1);
    setPathStack(newStack);
    loadFolder(newStack[newStack.length - 1] ?? '');
  };

  const toggleFile = (file) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[file.path]) delete next[file.path];
      else next[file.path] = file;
      return next;
    });
  };

  const selectAll = () => {
    const files = contents.filter(f => f.type === 'file');
    const allSelected = files.every(f => selected[f.path]);
    if (allSelected) {
      setSelected(prev => {
        const next = { ...prev };
        files.forEach(f => delete next[f.path]);
        return next;
      });
    } else {
      setSelected(prev => {
        const next = { ...prev };
        files.forEach(f => { next[f.path] = f; });
        return next;
      });
    }
  };

  const handleImport = async () => {
    const files = Object.values(selected);
    if (!files.length) return;
    setImporting(true);
    setError('');
    try {
      const res = await api.post('/tasks/bulk-github', {
        project_id: projectId,
        files,
        status: targetStatus,
      });
      setSuccess(`✅ ${res.data.created.length} tasks created!`);
      setSelected({});
      if (onImported) onImported(res.data.created);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = Object.keys(selected).length;
  const filesInView   = contents.filter(f => f.type === 'file');
  const allChecked    = filesInView.length > 0 && filesInView.every(f => selected[f.path]);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1080, padding: 16,
      }}
    >
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
        width: '100%', maxWidth: 680, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#e6edf3', marginBottom: 2 }}>
              <svg height="16" viewBox="0 0 16 16" fill="#58a6ff" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Import GitHub Files as Tasks
            </div>
            <div style={{ fontSize: 12, color: '#8b949e' }}>Browse your repo, select files → each becomes a Kanban task assigned to you</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {!repoConnected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 40 }}>
            <div style={{ fontSize: 48 }}>🔗</div>
            <p style={{ color: '#8b949e', textAlign: 'center' }}>
              No GitHub repository connected to this project.<br />
              Go to <strong style={{ color: '#58a6ff' }}>GitHub Integration</strong> to connect one first.
            </p>
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <div style={{ padding: '10px 24px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {pathStack.length > 0 && (
                <button onClick={goBack} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  ← Back
                </button>
              )}
              <svg height="14" viewBox="0 0 16 16" fill="#8b949e">
                <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
              </svg>
              <span style={{ color: '#8b949e', fontFamily: 'monospace', fontSize: 12 }}>/ {currentPath || 'root'}</span>
            </div>

            {/* Toolbar */}
            <div style={{ padding: '10px 24px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={selectAll}
                  disabled={filesInView.length === 0}
                  style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
                >
                  {allChecked ? 'Deselect all files' : `Select all ${filesInView.length} files`}
                </button>
                {selectedCount > 0 && (
                  <span style={{ fontSize: 12, color: '#58a6ff', fontWeight: 500 }}>
                    {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#8b949e', fontSize: 12 }}>Add to column:</span>
                <select
                  value={targetStatus}
                  onChange={e => setTargetStatus(e.target.value)}
                  style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '5px 10px', fontSize: 13, outline: 'none' }}
                >
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Alerts */}
            {error   && <div style={{ margin: '0 24px 10px', padding: '8px 12px', borderRadius: 6, fontSize: 13, background: '#1a0a0a', border: '1px solid #f85149', color: '#f85149' }}>{error}</div>}
            {success && <div style={{ margin: '0 24px 10px', padding: '8px 12px', borderRadius: 6, fontSize: 13, background: '#0a1a0a', border: '1px solid #238636', color: '#3fb950' }}>{success}</div>}

            {/* File list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ width: 24, height: 24, border: '2px solid #30363d', borderTop: '2px solid #58a6ff', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
                  <span style={{ color: '#8b949e', fontSize: 13 }}>Loading files...</span>
                </div>
              ) : contents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#8b949e', fontSize: 13 }}>This folder is empty</div>
              ) : (
                contents.map(item => {
                  if (item.type === 'dir') {
                    return (
                      <div
                        key={item.path}
                        onClick={() => openFolder(item.path)}
                        onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 24px', cursor: 'pointer', transition: 'background .1s' }}
                      >
                        <svg height="16" viewBox="0 0 16 16" fill="#8b949e" style={{ flexShrink: 0 }}>
                          <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
                        </svg>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#58a6ff', fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                          <div style={{ color: '#8b949e', fontSize: 11, fontFamily: 'monospace', marginTop: 1 }}>{item.path}</div>
                        </div>
                        <span style={{ color: '#8b949e', fontSize: 12 }}>→</span>
                      </div>
                    );
                  }

                  const checked = !!selected[item.path];
                  return (
                    <div
                      key={item.path}
                      onClick={() => toggleFile(item)}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#1c2128'; }}
                      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 24px', cursor: 'pointer',
                        background: checked ? '#1c2d3a' : 'transparent',
                        borderLeft: `3px solid ${checked ? '#1f6feb' : 'transparent'}`,
                        transition: 'background .1s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFile(item)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 16, height: 16, accentColor: '#1f6feb', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: extColor(item.name), flexShrink: 0, display: 'inline-block' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e6edf3', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ color: '#8b949e', fontSize: 11, fontFamily: 'monospace', marginTop: 1 }}>{item.path}</div>
                      </div>
                      <span style={{ color: '#8b949e', fontSize: 11, flexShrink: 0 }}>{fmtSize(item.size)}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ color: '#8b949e', fontSize: 13 }}>
                {selectedCount === 0
                  ? 'Select files above to import as tasks'
                  : `${selectedCount} file${selectedCount !== 1 ? 's' : ''} → ${COLUMNS.find(c => c.id === targetStatus)?.label}`
                }
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedCount || importing}
                  style={{
                    background: !selectedCount || importing ? '#21262d' : '#238636',
                    border: `1px solid ${!selectedCount || importing ? '#30363d' : '#2ea043'}`,
                    color: !selectedCount || importing ? '#484f58' : '#fff',
                    borderRadius: 6, padding: '7px 20px',
                    cursor: !selectedCount || importing ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 500,
                  }}
                >
                  {importing ? 'Creating tasks...' : `Import ${selectedCount || ''} file${selectedCount !== 1 ? 's' : ''} as tasks`}
                </button>
              </div>
            </div>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}