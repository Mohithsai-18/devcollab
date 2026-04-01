import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

const STATUS_COLORS = {
  backlog: '#6c757d', todo: '#0d6efd', in_progress: '#fd7e14',
  in_review: '#6f42c1', done: '#198754',
};

function Section({ icon, title, color, children }) {
  return (
    <div className="glass-panel" style={{
      background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}44`,
      borderLeft: `4px solid ${color}`, borderRadius: 12,
      padding: '16px 20px', marginBottom: 16,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 8, letterSpacing: '0.05em' }}>
        {icon} {title}
      </div>
      <div style={{ color: '#c9d1d9', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function HandoffCard({ h, expanded, onToggle }) {
  const files = (() => {
    try { return typeof h.files_changed === 'string' ? JSON.parse(h.files_changed) : (h.files_changed || []); }
    catch { return []; }
  })();

  return (
    <div className="glass-panel p-0 overflow-hidden mb-4" style={{
      boxShadow: expanded ? `0 0 25px ${h?.task_status && STATUS_COLORS[h.task_status] ? STATUS_COLORS[h.task_status] + '22' : 'rgba(31,111,235,0.15)'}` : 'none',
      transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: expanded ? 'scale(1.01)' : 'scale(1)',
    }}>
      <div onClick={onToggle} style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <code style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 4, padding: '2px 7px', fontSize: 12, color: '#8b949e', fontFamily: 'monospace' }}>
              {h.commit_sha?.substring(0, 7)}
            </code>
            <span style={{ background: '#1c2d3a', border: '1px solid #1f6feb', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#58a6ff' }}>
              🌿 {h.branch}
            </span>
            {h.task_title && (
              <span style={{ background: '#1a2a1a', border: '1px solid #238636', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: '#3fb950' }}>
                🎫 {h.task_title}
              </span>
            )}
            {h?.task_status && (
              <span style={{ background: (STATUS_COLORS[h.task_status] || '#6c757d') + '22', border: `1px solid ${STATUS_COLORS[h.task_status] || '#6c757d'}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, color: STATUS_COLORS[h.task_status] || '#6c757d' }}>
                {h.task_status.replace('_', ' ')}
              </span>
            )}
          </div>
          <div style={{ color: '#e6edf3', fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{h.commit_msg}</div>
          <div style={{ color: '#8b949e', fontSize: 12 }}>
            👤 {h.author} · {timeAgo(h.created_at)}
            {files.length > 0 && ` · ${files.length} file${files.length !== 1 ? 's' : ''} changed`}
          </div>
        </div>
        <div style={{ color: '#8b949e', fontSize: 18, flexShrink: 0, marginTop: 2 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {h.brief && !expanded && (
          <div style={{ margin: '0 20px 16px', padding: '14px 18px', background: 'rgba(31,111,235,0.05)', border: '1px solid rgba(31,111,235,0.2)', borderLeft: '4px solid #1f6feb', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#58a6ff', fontWeight: 700, marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Continuation Brief</div>
            <div style={{ color: '#e6edf3', fontSize: 13, lineHeight: 1.7, opacity: 0.9 }}>{h.brief}</div>
          </div>
      )}

      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          <Section icon="🔧" title="WHAT WAS CHANGED" color="#3fb950">{h.what_changed}</Section>
          <Section icon="⏳" title="WHAT IS PENDING" color="#f78166">{h.what_pending}</Section>
          <Section icon="👤" title="WHO DID WHAT" color="#8b949e">{h.who_did_what}</Section>
          <Section icon="📋" title="CONTINUATION BRIEF — FOR THE NEXT DEVELOPER" color="#58a6ff">{h.brief}</Section>

          {files.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#8b949e', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
                📁 FILES CHANGED ({files.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {files.map((f, i) => (
                  <span key={i} style={{
                    background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
                    padding: '3px 8px', fontSize: 11, fontFamily: 'monospace',
                    color: f.status === 'added' ? '#3fb950' : f.status === 'removed' ? '#f85149' : '#e6edf3',
                  }}>
                    {f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~'} {f.name}
                    <span style={{ color: '#8b949e', marginLeft: 4 }}>(+{f.additions} -{f.deletions})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManualSync({ projectId, onSynced }) {
  const [sha, setSha]         = useState('');
  const [branch, setBranch]   = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError]     = useState('');

  const handleSync = async () => {
    if (!sha.trim()) return;
    setSyncing(true); setError('');
    try {
      const res = await api.post('/handoff/sync', {
        project_id: projectId, commit_sha: sha.trim(), branch: branch.trim() || undefined,
      });
      onSynced(res.data.handoff);
      setSha(''); setBranch('');
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed');
    } finally { setSyncing(false); }
  };

  return (
    <div className="glass-panel p-4 mb-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <span style={{ fontSize: '1.2rem' }}>🔄</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
          Manual Sync
          <small className="d-block text-muted fw-normal" style={{ fontSize: '11px' }}>Generate brief from a specific commit SHA</small>
        </div>
      </div>
      {error && (
        <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '13px', background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.2)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}
      <div className="d-flex gap-2 flex-wrap">
        <input value={sha} onChange={e => setSha(e.target.value)}
          placeholder="Commit SHA..."
          className="form-control"
          style={{ flex: 2, minWidth: 200, fontSize: 13, fontFamily: 'monospace' }}
        />
        <input value={branch} onChange={e => setBranch(e.target.value)}
          placeholder="Branch (opt)"
          className="form-control"
          style={{ flex: 1, minWidth: 120, fontSize: 13 }}
        />
        <button className="btn-premium py-1 px-4 mt-0" onClick={handleSync} disabled={!sha.trim() || syncing} style={{ fontSize: '13px' }}>
          {syncing ? 'Generating...' : '⚡ Generate'}
        </button>
      </div>
      <div style={{ color: '#8b949e', fontSize: 12, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', pt: 2 }}>
        Tip: copy the SHA from your terminal after <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 3 }}>git push</code> or from GitHub.
      </div>
    </div>
  );
}

export default function HandoffPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter]     = useState('all');

  useEffect(() => { loadHandoffs(); }, [id]);

  const loadHandoffs = async () => {
    try {
      const res = await api.get(`/handoff/project/${id}`);
      setHandoffs(res.data);
      if (res.data.length) setExpanded(res.data[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSynced = (newHandoff) => {
    setHandoffs(prev => [newHandoff, ...prev]);
    setExpanded(newHandoff.id);
  };

  const filtered = handoffs.filter(h => {
    if (filter === 'linked')   return !!h.task_id;
    if (filter === 'unlinked') return !h.task_id;
    return true;
  });

  return (
    <div className="dark-page-bg">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <nav className="d-flex justify-content-between align-items-center px-4" style={{ height: '72px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn-premium-outline py-1 px-3 mt-0" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/project/${id}`)}>← Back</button>
          <span className="fw-bold text-white fs-5">AI Handoff Briefs</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{handoffs.length} brief{handoffs.length !== 1 ? 's' : ''}</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }} className="animate-in">

        <div className="glass-panel p-4 mb-4 animate-in stagger-1 d-flex align-items-start gap-3">
          <div style={{ fontSize: 24, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Automatic webhook setup</div>
            <div style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.7 }}>
              Go to your GitHub repo → <strong style={{ color: '#e6edf3' }}>Settings → Webhooks → Add webhook</strong><br />
              Payload URL: <code style={{ background: '#21262d', padding: '2px 6px', borderRadius: 4, color: '#58a6ff' }}>
                {process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/handoff/webhook
              </code><br />
              Content type: <code style={{ background: '#21262d', padding: '2px 6px', borderRadius: 4 }}>application/json</code> · Events: <strong style={{ color: '#e6edf3' }}>Just the push event</strong>
            </div>
          </div>
        </div>

        <ManualSync projectId={id} onSynced={handleSynced} />

        <div className="d-flex mb-4 gap-2" style={{ borderBottom: '1px solid var(--border-glass)' }}>
          {[
            { key: 'all',      label: `All` },
            { key: 'linked',   label: `Linked` },
            { key: 'unlinked', label: `Unlinked` },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              background: 'transparent', border: 'none',
              borderBottom: filter === t.key ? '3px solid var(--accent-blue)' : '3px solid transparent',
              color: filter === t.key ? 'white' : 'var(--text-muted)',
              padding: '12px 20px', cursor: 'pointer', fontSize: 13,
              fontWeight: filter === t.key ? 700 : 500,
              transition: 'all 0.2s ease',
            }}>{t.label} <span className="badge ms-1" style={{ background: 'rgba(255,255,255,0.1)', fontWeight: 400 }}>{t.key === 'all' ? handoffs.length : t.key === 'linked' ? handoffs.filter(h => h.task_id).length : handoffs.filter(h => !h.task_id).length}</span></button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 28, height: 28, border: '2px solid #30363d', borderTop: '2px solid #58a6ff', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ color: '#8b949e' }}>Loading handoff briefs...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3', marginBottom: 8 }}>No handoff briefs yet</div>
            <div style={{ color: '#8b949e', lineHeight: 1.7 }}>
              Push a commit with the webhook set up, or use<br />the manual sync above with a commit SHA.
            </div>
          </div>
        ) : (
          filtered.map(h => (
            <HandoffCard key={h.id} h={h} expanded={expanded === h.id}
              onToggle={() => setExpanded(expanded === h.id ? null : h.id)} />
          ))
        )}
      </div>
    </div>
  );
}