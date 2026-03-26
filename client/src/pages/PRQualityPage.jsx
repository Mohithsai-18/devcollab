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
  return (
    <div style={{
      background: '#0d1117',
      border: `1px solid ${RATING_COLORS[rating] || '#30363d'}33`,
      borderLeft: `3px solid ${RATING_COLORS[rating] || '#30363d'}`,
      borderRadius: 8, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: issues?.length ? 10 : 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#e6edf3' }}>{icon} {title}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: RATING_COLORS[rating], background: RATING_COLORS[rating] + '22', borderRadius: 20, padding: '2px 10px' }}>
          {rating?.toUpperCase()}
        </span>
      </div>
      {issues?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {issues.map((issue, i) => (
            <li key={i} style={{ color: '#8b949e', fontSize: 13, lineHeight: 1.7 }}>{issue}</li>
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
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <nav style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate(`/project/${id}`)} style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>← Back</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>🔍 PR Quality Gate</span>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input card */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
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
              style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 14, outline: 'none' }}
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
            <div style={{ background: vStyle.bg, border: `1px solid ${vStyle.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <ScoreRing score={result.review.score} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{vStyle.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: vStyle.color }}>{verdict}</span>
                </div>
                <div style={{ color: '#e6edf3', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{result.review.summary}</div>
                <div style={{ color: '#8b949e', fontSize: 12 }}>
                  PR: <strong style={{ color: '#58a6ff' }}>{result.pr_title}</strong> by {result.pr_author}
                </div>
              </div>
            </div>

            {/* 4 categories */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <CategoryCard icon="⚙️" title="Code Quality"     rating={result.review.quality?.rating}          issues={result.review.quality?.issues} />
              <CategoryCard icon="🧪" title="Test Coverage"    rating={result.review.tests?.rating}            issues={result.review.tests?.issues} />
              <CategoryCard icon="🔒" title="Security"         rating={result.review.security?.rating}         issues={result.review.security?.issues} />
              <CategoryCard icon="💥" title="Breaking Changes" rating={result.review.breaking_changes?.rating}  issues={result.review.breaking_changes?.issues} />
            </div>

            {/* Recommendations */}
            {result.review.recommendations?.length > 0 && (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>📋 Recommendations</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {result.review.recommendations.map((r, i) => (
                    <li key={i} style={{ color: '#c9d1d9', fontSize: 13, lineHeight: 1.8 }}>{r}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Files */}
            {result.files?.length > 0 && (
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 10 }}>📁 Files Changed ({result.files.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.files.map((f, i) => (
                    <span key={i} style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 4, padding: '3px 8px', fontSize: 11, color: '#e6edf3', fontFamily: 'monospace' }}>{f}</span>
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