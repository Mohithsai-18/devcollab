import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const RISK_STYLES = {
  high:   { color: '#f85149', bg: '#2a1a1a', border: '#f85149' },
  medium: { color: '#f78166', bg: '#2a2a1a', border: '#f78166' },
  low:    { color: '#3fb950', bg: '#1a2a1a', border: '#238636' },
};

export default function ImpactAnalyserPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filePath, setFilePath]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');
  const [repoFiles, setRepoFiles]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => { loadRepoFiles(); }, [id]); // eslint-disable-line

  const loadRepoFiles = async () => {
    try {
      const res = await api.get(`/github/folder/${id}?path=`);
      setRepoFiles(res.data.files?.map(f => f.path) || []);
    } catch {}
  };

  const handleAnalyse = async () => {
    if (!filePath.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/impact', { project_id: id, file_path: filePath.trim() });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Impact analysis failed');
    } finally { setLoading(false); }
  };

  const riskStyle = RISK_STYLES[result?.impact?.risk_level] || RISK_STYLES.low;
  const filtered  = repoFiles.filter(f => filePath && f.toLowerCase().includes(filePath.toLowerCase()));

  return (
    <div className="dark-page-bg">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <nav className="d-flex justify-content-between align-items-center px-4" style={{ height: '72px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn-premium-outline py-1 px-3 mt-0" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/project/${id}`)}>← Back</button>
          <span className="fw-bold text-white fs-5">Impact Analyser</span>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }} className="animate-in">

        {/* Input */}
        <div className="glass-panel p-4 mb-4 animate-in stagger-1">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Enter a file path to analyse its impact</div>
          <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 14 }}>
            AI will show which tasks are affected and which other files might break if this file changes.
          </div>
          {error && (
            <div style={{ background: '#1a0a0a', border: '1px solid #f85149', color: '#f85149', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={filePath}
                onChange={e => { setFilePath(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
                placeholder="e.g. server/controllers/authController.js"
                className="form-control"
                style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace' }}
              />
              <button onClick={handleAnalyse} disabled={loading || !filePath.trim()} style={{
                background: loading || !filePath.trim() ? '#21262d' : '#1f6feb',
                border: `1px solid ${loading || !filePath.trim() ? '#30363d' : '#388bfd'}`,
                color: loading || !filePath.trim() ? '#484f58' : '#fff',
                borderRadius: 6, padding: '8px 20px',
                cursor: loading || !filePath.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 14, height: 14, border: '2px solid #30363d', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                      Analysing...
                    </span>
                  : '💥 Analyse Impact'
                }
              </button>
            </div>

            {/* Autocomplete */}
            {showSuggestions && filtered.length > 0 && (
              <div className="glass-panel p-1 position-absolute w-100 mt-1 shadow-lg" style={{ top: '100%', zIndex: 100, maxHeight: 200, overflowY: 'auto', background: 'rgba(6,9,19,0.95)', backdropFilter: 'blur(20px)' }}>
                {filtered.slice(0, 8).map((f, i) => (
                  <div key={i} onClick={() => { setFilePath(f); setShowSuggestions(false); }}
                    className="p-2 px-3 rounded-2"
                    style={{ cursor: 'pointer', fontSize: 13, fontFamily: 'monospace', color: 'var(--text-main)', transition: 'background 0.2s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span className="text-muted mr-2">📄</span> {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Risk summary */}
            {/* Risk summary */}
            <div className="glass-panel mb-4 p-4" style={{
              background: `linear-gradient(135deg, ${riskStyle.bg} 0%, rgba(2,6,23,0.8) 100%)`,
              border: `1px solid ${riskStyle.border}66`,
              boxShadow: `0 0 30px ${riskStyle.border}11`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {result?.impact?.risk_level === 'high' ? '🔴' : result?.impact?.risk_level === 'medium' ? '🟡' : '🟢'}
                </span>
                <span style={{ fontWeight: 900, fontSize: 20, color: riskStyle.color, letterSpacing: '-0.02em' }}>
                  {(result?.impact?.risk_level || 'low').toUpperCase()} RISK
                </span>
                <code style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 6, padding: '4px 12px', fontSize: 13, color: 'var(--accent-blue)', marginLeft: 'auto' }}>
                  {result?.file_path}
                </code>
              </div>
              <div style={{ color: 'white', fontSize: 15, lineHeight: 1.8, opacity: 0.9, fontWeight: 500 }}>{result?.impact?.summary || 'No impact summary available.'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

              {/* Affected tasks */}
              {/* Affected tasks */}
              <div className="glass-panel p-4">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>🎫</span> Affected Tasks ({result?.impact?.affected_tasks?.length || 0})
                </div>
                {!result?.impact?.affected_tasks?.length ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No tasks directly affected.</div>
                ) : result.impact.affected_tasks.map((t, i) => (
                  <div key={i} className="p-3 rounded-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 6 }}>{t.task_title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t.reason}</div>
                  </div>
                ))}
              </div>

              {/* Affected files */}
              {/* Affected files */}
              <div className="glass-panel p-4">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>📁</span> Files at Risk ({result?.impact?.affected_files?.length || 0})
                </div>
                {!result?.impact?.affected_files?.length ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>No dependencies at risk.</div>
                ) : result.impact.affected_files.map((f, i) => (
                  <div key={i} className="p-3 rounded-3 mb-3" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${RISK_STYLES[f.risk]?.border || 'var(--border-glass)'}44`,
                    borderLeft: `4px solid ${RISK_STYLES[f.risk]?.border || 'var(--border-glass)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <code style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>{f.file}</code>
                      <span style={{ fontSize: 10, color: 'white', background: RISK_STYLES[f.risk]?.color, borderRadius: 20, padding: '2px 10px', fontWeight: 800, textTransform: 'uppercase' }}>
                        {f.risk}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result?.impact?.recommendations?.length > 0 && (
              <div className="glass-panel p-4">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>📋</span> Recommendations
                </div>
                <ol style={{ margin: 0, paddingLeft: 22 }}>
                  {result.impact.recommendations.map((r, i) => (
                    <li key={i} style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.8, marginBottom: 8 }}>{r}</li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}