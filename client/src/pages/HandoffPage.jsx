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
    <div style={{
      background: '#0d1117', border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`, borderRadius: 8,
      padding: '14px 18px', marginBottom: 12,
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
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
      marginBottom: 16, overflow: 'hidden',
      boxShadow: expanded ? '0 0 0 2px #1f6feb44' : 'none',
      transition: 'box-shadow .2s',
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
            {h.task_status && (
              <span style={{ background: STATUS_COLORS[h.task_status] + '22', border: `1px solid ${STATUS_COLORS[h.task_status]}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, color: STATUS_COLORS[h.task_status] }}>
                {h.task_status?.replace('_', ' ')}
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
        <div style={{ margin: '0 20px 16px', padding: '12px 14px', background: '#0d1117', border: '1px solid #1f6feb33', borderLeft: '3px solid #1f6feb', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: '#58a6ff', fontWeight: 600, marginBottom: 6, letterSpacing: '0.05em' }}>📋 CONTINUATION BRIEF</div>
          <div style={{ color: '#c9d1d9', fontSize: 13, lineHeight: 1.6 }}>{h.brief}</div>
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
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '18px 20px', marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>
        🔄 Manual Sync — Generate brief from a specific commit
      </div>
      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #f85149', color: '#f85149', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={sha} onChange={e => setSha(e.target.value)}
          placeholder="Commit SHA (full or short)"
          style={{ flex: 2, minWidth: 200, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
        />
        <input value={branch} onChange={e => setBranch(e.target.value)}
          placeholder="Branch (optional)"
          style={{ flex: 1, minWidth: 140, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 13, outline: 'none' }}
        />
        <button onClick={handleSync} disabled={!sha.trim() || syncing}
          style={{
            background: !sha.trim() || syncing ? '#21262d' : '#238636',
            border: `1px solid ${!sha.trim() || syncing ? '#30363d' : '#2ea043'}`,
            color: !sha.trim() || syncing ? '#484f58' : '#fff',
            borderRadius: 6, padding: '8px 18px',
            cursor: !sha.trim() || syncing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          {syncing ? '⟳ Generating...' : '⚡ Generate Brief'}
        </button>
      </div>
      <div style={{ color: '#8b949e', fontSize: 12, marginTop: 8 }}>
        Tip: copy the SHA from your terminal after <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3 }}>git push</code> or from the GitHub commits page.
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
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 14 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} ::-webkit-scrollbar{width:8px} ::-webkit-scrollbar-track{background:#161b22} ::-webkit-scrollbar-thumb{background:#30363d;border-radius:4px}`}</style>

      <nav style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(`/project/${id}`)}
            style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            ← Back
          </button>
          <div style={{ fontWeight: 600, fontSize: 15 }}>🤖 AI Handoff Briefs</div>
        </div>
        <span style={{ color: '#8b949e', fontSize: 12 }}>{handoffs.length} brief{handoffs.length !== 1 ? 's' : ''}</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Automatic webhook setup</div>
            <div style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.7 }}>
              Go to your GitHub repo → <strong style={{ color: '#e6edf3' }}>Settings → Webhooks → Add webhook</strong><br />
              Payload URL: <code style={{ background: '#21262d', padding: '2px 6px', borderRadius: 4, color: '#58a6ff' }}>
                http://localhost:5000/api/handoff/webhook
              </code><br />
              Content type: <code style={{ background: '#21262d', padding: '2px 6px', borderRadius: 4 }}>application/json</code> · Events: <strong style={{ color: '#e6edf3' }}>Just the push event</strong>
            </div>
          </div>
        </div>

        <ManualSync projectId={id} onSynced={handleSynced} />

        <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid #30363d' }}>
          {[
            { key: 'all',      label: `All (${handoffs.length})` },
            { key: 'linked',   label: `Linked to task (${handoffs.filter(h => h.task_id).length})` },
            { key: 'unlinked', label: `Unlinked (${handoffs.filter(h => !h.task_id).length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              background: 'transparent', border: 'none',
              borderBottom: filter === t.key ? '2px solid #f78166' : '2px solid transparent',
              color: filter === t.key ? '#e6edf3' : '#8b949e',
              padding: '10px 16px', cursor: 'pointer', fontSize: 13,
              fontWeight: filter === t.key ? 500 : 400,
            }}>{t.label}</button>
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