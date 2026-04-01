import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="dark-page-bg" style={{ overflow: 'hidden', position: 'relative' }}>
      
      {/* Background Glows */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      {/* Navigation */}
      <nav className="d-flex justify-content-between align-items-center" style={{ padding: '24px 48px', position: 'relative', zIndex: 10 }}>
        <div className="d-flex align-items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="url(#paint0_linear)"/>
            <path d="M11 16L15 20L21 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="paint0_linear" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="1" stopColor="#8B5CF6"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="fw-bold fs-4 text-white">DevCollab</span>
        </div>
        <div className="d-flex gap-3">
          {user ? (
            <button className="btn-premium" onClick={() => navigate('/dashboard')}>
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button className="btn-premium-outline" onClick={() => navigate('/login')}>Log In</button>
              <button className="btn-premium" onClick={() => navigate('/register')}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container text-center animate-in" style={{ paddingTop: '12vh', position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: '30px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#e2e8f0', fontSize: '14px', fontWeight: 500, marginBottom: '24px'
        }}>
          ✨ The Ultimate AI-Powered Developer Workspace
        </div>
        
        <h1 className="display-3 fw-bold mb-4" style={{ lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          Build software faster, <br />
          <span className="text-gradient">together with AI.</span>
        </h1>
        
        <p className="lead mx-auto mb-5" style={{ color: 'var(--text-muted)', maxWidth: '600px', fontSize: '1.25rem' }}>
          DevCollab seamlessly integrates GitHub, AI-powered Code Reviews, Kanban sprints, and semantic RAG intelligence into one breathtaking platform.
        </p>
        
        <div className="d-flex gap-3 justify-content-center">
          <button className="btn-premium py-3 px-5 fs-5" onClick={() => navigate(user ? '/dashboard' : '/register')}>
            {user ? 'Open Workspace' : 'Start Building Now'}
          </button>
          <button className="btn-premium-outline py-3 px-4 fs-5" onClick={() => navigate('/import/github')}>
            <svg height="20" viewBox="0 0 16 16" fill="currentColor" className="me-2"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            Connect GitHub
          </button>
        </div>

        {/* Feature Cards Showcase */}
        <div className="row mt-5 pt-4 text-start">
          <div className="col-md-4 mb-4 animate-in stagger-1">
            <div className="glass-panel p-4 h-100">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 24 }}>🧠</span>
              </div>
              <h4 className="fw-bold fs-5">Semantic RAG Matrix</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Ask complex questions about your entire codebase. Our LLMs hallucinate nothing and cite exactly where the answers live.</p>
            </div>
          </div>
          <div className="col-md-4 mb-4 animate-in stagger-2">
            <div className="glass-panel p-4 h-100">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 24 }}>🚀</span>
              </div>
              <h4 className="fw-bold fs-5">AI Code Analyst</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Auto-review Pull Requests, estimate story points, and break down complex features into sub-tasks using Groq 70B models.</p>
            </div>
          </div>
          <div className="col-md-4 mb-4 animate-in stagger-3">
            <div className="glass-panel p-4 h-100">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 24 }}>⚡</span>
              </div>
              <h4 className="fw-bold fs-5">Realtime Workflow</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Experience zero-latency task management. Instant socket-sync ensures your whole team sees Kanban updates instantly.</p>
            </div>
          </div>
        </div>
      </main>
      


    </div>
  );
}

export default Landing;
