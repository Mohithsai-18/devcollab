import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function AIChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I know your codebase, tasks, and recent commits. Ask me anything about this project.', sources: null }
  ]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [filePath, setFilePath]     = useState('');
  const [showFileInput, setShowFileInput] = useState(false);
  const [indexStatus, setIndexStatus] = useState({ status: 'idle', docs_indexed: 0 });
  const [indexing, setIndexing]     = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch index status on mount and periodically while indexing
  useEffect(() => {
    fetchIndexStatus();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchIndexStatus = async () => {
    try {
      const res = await api.get(`/ai/index-status/${id}`);
      setIndexStatus(res.data);
      if (res.data.status === 'indexing') {
        startPolling();
      } else {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setIndexing(false);
      }
    } catch { /* ignore */ }
  };

  const startPolling = () => {
    if (pollRef.current) return;
    setIndexing(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/ai/index-status/${id}`);
        setIndexStatus(res.data);
        if (res.data.status !== 'indexing') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setIndexing(false);
        }
      } catch { /* ignore */ }
    }, 3000);
  };

  const handleIndex = async () => {
    try {
      setIndexing(true);
      await api.post('/ai/index', { project_id: id });
      startPolling();
    } catch (err) {
      setIndexing(false);
      alert('Failed to start indexing: ' + (err.response?.data?.message || err.message));
    }
  };

  const suggestions = [
    'Where is authentication handled?',
    'What tasks are currently in progress?',
    'What was the last thing changed?',
    'Which files handle the API routes?',
    'What is pending from the last handoff?',
  ];

  const send = async (question) => {
    const q = question || input.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q, sources: null }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', {
        project_id: id,
        question: q,
        file_path: filePath || undefined,
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources || null,
        ragMode: res.data.rag_mode || 'fallback',
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + (err.response?.data?.message || 'Failed to get answer'), sources: null }]);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    idle: { bg: '#30363d', text: '#8b949e', label: '⚪ Not Indexed' },
    indexing: { bg: '#1c2d3a', text: '#58a6ff', label: '🔄 Indexing...' },
    ready: { bg: '#0d2818', text: '#3fb950', label: '🟢 RAG Ready' },
    error: { bg: '#3d1a1a', text: '#f85149', label: '🔴 Error' },
  };

  const st = statusColors[indexStatus.status] || statusColors.idle;

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117', color: '#e6edf3',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      {/* Nav */}
      <nav style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate(`/project/${id}`)} style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>← Back</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>🧠 AI Project Chat</span>
          {/* Index Status Badge */}
          <span style={{
            background: st.bg, color: st.text, fontSize: 11, fontWeight: 600,
            padding: '3px 10px', borderRadius: 12, letterSpacing: '0.03em',
            animation: indexStatus.status === 'indexing' ? 'pulse 1.5s infinite' : 'none',
          }}>
            {st.label} {indexStatus.docs_indexed > 0 ? `(${indexStatus.docs_indexed} chunks)` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Index Button */}
          <button
            onClick={handleIndex}
            disabled={indexing}
            style={{
              background: indexing ? '#21262d' : 'linear-gradient(135deg, #238636, #2ea043)',
              border: '1px solid #2ea043',
              color: indexing ? '#484f58' : '#fff',
              borderRadius: 6, padding: '5px 14px', cursor: indexing ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            {indexing ? '⏳ Indexing...' : '🔄 Index Project'}
          </button>
          <button
            onClick={() => setShowFileInput(!showFileInput)}
            style={{ background: showFileInput ? '#1c2d3a' : 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}
          >
            📁 {filePath || 'Focus on a file'}
          </button>
        </div>
      </nav>

      {/* File path input */}
      {showFileInput && (
        <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '10px 24px', display: 'flex', gap: 8 }}>
          <input
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
            placeholder="e.g. client/src/pages/ProjectView.jsx"
            style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '7px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
          />
          <button onClick={() => { setFilePath(''); setShowFileInput(false); }} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
            Clear
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 10, fontWeight: 600, letterSpacing: '0.05em' }}>SUGGESTED QUESTIONS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  style={{ background: '#161b22', border: '1px solid #30363d', color: '#8b949e', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}
                  onMouseEnter={e => e.target.style.borderColor = '#58a6ff'}
                  onMouseLeave={e => e.target.style.borderColor = '#30363d'}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: m.role === 'user' ? '#1f6feb' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                border: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>
                {m.role === 'user' ? '👤' : '🧠'}
              </div>
              <div style={{
                background: m.role === 'user' ? '#1c2d3a' : '#161b22',
                border: `1px solid ${m.role === 'user' ? '#1f6feb' : '#30363d'}`,
                borderRadius: 10, padding: '12px 16px', maxWidth: '80%',
                fontSize: 14, lineHeight: 1.7, color: '#e6edf3',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {m.content}
                {/* RAG Mode indicator */}
                {m.ragMode && m.role === 'assistant' && (
                  <div style={{ marginTop: 8, fontSize: 10, color: m.ragMode === 'semantic' ? '#3fb950' : '#8b949e', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {m.ragMode === 'semantic' ? '🧠 Semantic RAG' : '🔍 Keyword Fallback'}
                  </div>
                )}
              </div>
            </div>

            {/* Source Citations */}
            {m.sources && m.sources.length > 0 && m.sources[0]?.type !== 'fallback' && (
              <div style={{ marginLeft: 44, marginTop: 6 }}>
                <details style={{ fontSize: 12 }}>
                  <summary style={{ color: '#8b949e', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
                    📎 {m.sources.length} sources used
                  </summary>
                  <div style={{
                    background: '#0d1117', border: '1px solid #21262d', borderRadius: 8,
                    padding: '8px 12px', marginTop: 6,
                  }}>
                    {m.sources.map((s, si) => (
                      <div key={si} style={{
                        display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0',
                        borderBottom: si < m.sources.length - 1 ? '1px solid #161b22' : 'none',
                        fontSize: 11,
                      }}>
                        <span style={{
                          background: s.type === 'code' ? '#1c2d3a' : s.type === 'task' ? '#0d2818' : s.type === 'handoff' ? '#2d1b1a' : '#21262d',
                          color: s.type === 'code' ? '#58a6ff' : s.type === 'task' ? '#3fb950' : s.type === 'handoff' ? '#f0883e' : '#8b949e',
                          padding: '1px 6px', borderRadius: 4, fontWeight: 600, fontSize: 10, textTransform: 'uppercase',
                        }}>
                          {s.type}
                        </span>
                        <span style={{ color: '#e6edf3', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.source}
                        </span>
                        <span style={{ color: '#3fb950', fontWeight: 500 }}>
                          {s.relevance !== 'N/A' ? `${(s.relevance * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #30363d', padding: '16px 24px', background: '#161b22', flexShrink: 0 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask anything about your codebase or project..."
            disabled={loading}
            style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '10px 14px', fontSize: 14, outline: 'none' }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? '#21262d' : 'linear-gradient(135deg, #238636, #2ea043)',
              border: `1px solid ${loading || !input.trim() ? '#30363d' : '#2ea043'}`,
              color: loading || !input.trim() ? '#484f58' : '#fff',
              borderRadius: 8, padding: '10px 18px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 500,
            }}
          >
            {loading ? '...' : 'Send →'}
          </button>
        </div>
      </div>
    </div>
  );
}