import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const VERDICT_STYLES = {
  APPROVE:         { bg: '#1a2a1a', border: '#238636', color: '#3fb950', icon: '✅' },
  REQUEST_CHANGES: { bg: '#2a1a1a', border: '#f85149', color: '#f85149', icon: '❌' },
  NEEDS_REVIEW:    { bg: '#2a2a1a', border: '#f78166', color: '#f78166', icon: '⚠️' },
};

const RATING_COLORS = { good: '#3fb950', fair: '#f78166', poor: '#f85149' };

function ScoreRing({ score }) {
  const color = score >= 75 ? '#3fb950' : score >= 50 ? '#f78166' : '#f85149';
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#21262d" strokeWidth="8" />
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(score / 100) * 213.6} 213.6`}
          strokeLinecap="round" transform="rotate(-90 40 40)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 9, color: '#8b949e' }}>/ 100</span>
      </div>
    </div>
  );
}

function CategoryCard({ icon, title, rating, issues }) {
  const color = RATING_COLORS[rating] || 'var(--border-glass)';
  return (
    <div className="glass-panel" style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${color}44`,
      borderLeft: `4px solid ${color}`,
      boxShadow: `inset 0 0 20px ${color}11`,
      borderRadius: 12, padding: '18px 20px',
      height: '100%',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: issues?.length ? 14 : 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'white' }}>{icon} {title}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'white', background: color, borderRadius: 20, padding: '2px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {rating}
        </span>
      </div>
      {issues?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {issues.map((issue, i) => (
            <li key={i} style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.8, marginBottom: 4 }}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PRQualityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prUrl, setPrUrl]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const handleReview = async () => {
    if (!prUrl.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/ai/pr-review', { project_id: id, pr_url: prUrl.trim() });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'PR review failed');
    } finally { setLoading(false); }
  };

  const verdict = result?.review?.verdict;
  const vStyle  = VERDICT_STYLES[verdict] || VERDICT_STYLES.NEEDS_REVIEW;

  return (
    <div className="dark-page-bg">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <nav className="d-flex justify-content-between align-items-center px-4" style={{ height: '72px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(6,9,19,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn-premium-outline py-1 px-3 mt-0" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/project/${id}`)}>← Back</button>
          <span className="fw-bold text-white fs-5">PR Quality Gate</span>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }} className="animate-in">

        {/* Input card */}
        <div className="glass-panel p-4 mb-4 animate-in stagger-1">
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>Paste a GitHub Pull Request URL</div>
          <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 14 }}>AI will check code quality, security, missing tests, and breaking changes.</div>
          {error && (
            <div style={{ background: '#1a0a0a', border: '1px solid #f85149', color: '#f85149', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={prUrl}
              onChange={e => setPrUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReview()}
              placeholder="https://github.com/owner/repo/pull/123"
              className="form-control"
              style={{ flex: 1, padding: '8px 12px', fontSize: 14 }}
            />
            <button onClick={handleReview} disabled={loading || !prUrl.trim()} style={{
              background: loading || !prUrl.trim() ? '#21262d' : '#238636',
              border: `1px solid ${loading || !prUrl.trim() ? '#30363d' : '#2ea043'}`,
              color: loading || !prUrl.trim() ? '#484f58' : '#fff',
              borderRadius: 6, padding: '8px 20px',
              cursor: loading || !prUrl.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 14, height: 14, border: '2px solid #30363d', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                    Analysing...
                  </span>
                : '🔍 Analyse PR'
              }
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Verdict */}
            <div className="glass-panel mb-4 p-4 d-flex align-items-center gap-4 flex-wrap" style={{
              background: `linear-gradient(135deg, ${vStyle.bg} 0%, rgba(2,6,23,0.8) 100%)`,
              border: `1px solid ${vStyle.border}66`,
              boxShadow: `0 0 30px ${vStyle.border}11`,
            }}>
              <ScoreRing score={result?.review?.score || 0} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>{vStyle.icon}</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: vStyle.color, letterSpacing: '-0.02em' }}>{verdict || 'NEEDS REVIEW'}</span>
                </div>
                <div style={{ color: 'white', fontSize: 15, fontWeight: 500, lineHeight: 1.6, marginBottom: 12, opacity: 0.9 }}>{result?.review?.summary || 'No summary available.'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 2 }}>
                  PR: <strong style={{ color: 'var(--accent-blue)' }}>{result?.pr_title || 'Unknown'}</strong> <span style={{ mx: 1 }}>·</span> by {result?.pr_author || 'unknown'}
                </div>
              </div>
            </div>

            {/* 4 categories */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <CategoryCard icon="⚙️" title="Code Quality"     rating={result?.review?.quality?.rating}          issues={result?.review?.quality?.issues} />
              <CategoryCard icon="🧪" title="Test Coverage"    rating={result?.review?.tests?.rating}            issues={result?.review?.tests?.issues} />
              <CategoryCard icon="🔒" title="Security"         rating={result?.review?.security?.rating}         issues={result?.review?.security?.issues} />
              <CategoryCard icon="💥" title="Breaking Changes" rating={result?.review?.breaking_changes?.rating}  issues={result?.review?.breaking_changes?.issues} />
            </div>

            {/* Recommendations */}
            {result.review.recommendations?.length > 0 && (
              <div className="glass-panel p-4 mb-4">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>📋</span> Recommendations
                </div>
                <ol style={{ margin: 0, paddingLeft: 22 }}>
                  {result.review.recommendations.map((r, i) => (
                    <li key={i} style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.8, marginBottom: 8 }}>{r}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Files */}
            {result.files?.length > 0 && (
              <div className="glass-panel p-4">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 14 }}>📁 Files Changed ({result.files.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.files.map((f, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: 'var(--accent-blue)', fontFamily: 'monospace', fontWeight: 500 }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}