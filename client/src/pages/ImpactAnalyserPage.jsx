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
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <nav style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(`/project/${id}`)} style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>← Back</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>💥 Impact Analyser</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
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
                style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
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
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 80, background: '#161b22', border: '1px solid #30363d', borderRadius: 6, zIndex: 10, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {filtered.slice(0, 8).map((f, i) => (
                  <div key={i} onClick={() => { setFilePath(f); setShowSuggestions(false); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', color: '#e6edf3', borderBottom: '1px solid #21262d' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >{f}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Risk summary */}
            <div style={{ background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>
                  {result.impact.risk_level === 'high' ? '🔴' : result.impact.risk_level === 'medium' ? '🟡' : '🟢'}
                </span>
                <span style={{ fontWeight: 700, fontSize: 16, color: riskStyle.color }}>
                  {result.impact.risk_level?.toUpperCase()} RISK
                </span>
                <code style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#8b949e', marginLeft: 'auto' }}>
                  {result.file_path}
                </code>
              </div>
              <div style={{ color: '#c9d1d9', fontSize: 14, lineHeight: 1.7 }}>{result.impact.summary}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

              {/* Affected tasks */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>
                  🎫 Affected Tasks ({result.impact.affected_tasks?.length || 0})
                </div>
                {!result.impact.affected_tasks?.length ? (
                  <div style={{ color: '#8b949e', fontSize: 13 }}>No tasks directly affected.</div>
                ) : result.impact.affected_tasks.map((t, i) => (
                  <div key={i} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: '#e6edf3', marginBottom: 4 }}>{t.task_title}</div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>{t.reason}</div>
                  </div>
                ))}
              </div>

              {/* Affected files */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>
                  📁 Files That Might Break ({result.impact.affected_files?.length || 0})
                </div>
                {!result.impact.affected_files?.length ? (
                  <div style={{ color: '#8b949e', fontSize: 13 }}>No files at risk.</div>
                ) : result.impact.affected_files.map((f, i) => (
                  <div key={i} style={{ background: '#0d1117', border: `1px solid ${RISK_STYLES[f.risk]?.border || '#30363d'}33`, borderLeft: `3px solid ${RISK_STYLES[f.risk]?.border || '#30363d'}`, borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <code style={{ fontSize: 11, color: '#e6edf3' }}>{f.file}</code>
                      <span style={{ fontSize: 10, color: RISK_STYLES[f.risk]?.color, background: RISK_STYLES[f.risk]?.bg, borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>
                        {f.risk?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8b949e' }}>{f.reason}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result.impact.recommendations?.length > 0 && (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 10 }}>📋 Recommendations</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {result.impact.recommendations.map((r, i) => (
                    <li key={i} style={{ color: '#c9d1d9', fontSize: 13, lineHeight: 1.8 }}>{r}</li>
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