import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import CodeReview from '../components/CodeReview/CodeReview';
import NotificationBell from '../components/Notifications/NotificationBell';
import TaskComments from '../components/Common/TaskComments';
import TaskAttachments from '../components/Common/TaskAttachments';
import GitHubCodeReview from '../components/CodeReview/GitHubCodeReview';

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     color: '#6c757d' },
  { id: 'todo',        label: 'To Do',       color: '#0d6efd' },
  { id: 'in_progress', label: 'In Progress', color: '#fd7e14' },
  { id: 'in_review',   label: 'In Review',   color: '#6f42c1' },
  { id: 'done',        label: 'Done',        color: '#198754' },
];

const PRIORITY_COLORS = { p1: 'danger', p2: 'warning', p3: 'info', p4: 'secondary' };
const PRIORITY_LABELS = { p1: 'Critical', p2: 'High', p3: 'Medium', p4: 'Low' };

// ─── GitHub Link Modal ────────────────────────────────────────────────────────
function GitHubLinkModal({ task, projectId, onClose, onLinked }) {
  const [branches, setBranches]               = useState([]);
  const [commits, setCommits]                 = useState([]);
  const [selectedBranch, setSelectedBranch]   = useState(task.github_branch || '');
  const [selectedCommit, setSelectedCommit]   = useState(task.github_commit_sha || '');
  const [selectedCommitMsg, setSelectedCommitMsg] = useState(task.github_commit_msg || '');
  const [prUrl, setPrUrl]                     = useState(task.github_pr_url || '');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingCommits, setLoadingCommits]   = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState('');
  const [noRepo, setNoRepo]                   = useState(false);
  const [tab, setTab]                         = useState('branch');

  useEffect(() => { fetchBranches(); }, []); // eslint-disable-line
  useEffect(() => { if (selectedBranch) fetchCommits(selectedBranch); }, [selectedBranch]); // eslint-disable-line

  const fetchBranches = async () => {
    try {
      const res = await api.get(`/github/branches/${projectId}`);
      setBranches(res.data);
    } catch (err) {
      if (err.response?.status === 404) setNoRepo(true);
      else setError('Failed to load branches');
    } finally { setLoadingBranches(false); }
  };

  const fetchCommits = async (branch) => {
    setLoadingCommits(true);
    try {
      const res = await api.get(`/github/commits/${projectId}?branch=${encodeURIComponent(branch)}`);
      setCommits(res.data);
    } catch { setCommits([]); }
    finally { setLoadingCommits(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/tasks/${task.id}/github`, {
        github_branch:     selectedBranch || null,
        github_commit_sha: selectedCommit || null,
        github_commit_msg: selectedCommitMsg || null,
        github_pr_url:     prUrl || null,
      });
      onLinked({ ...task, github_branch: selectedBranch || null, github_commit_sha: selectedCommit || null, github_commit_msg: selectedCommitMsg || null, github_pr_url: prUrl || null });
      onClose();
    } catch { setError('Failed to save GitHub link'); }
    finally { setSaving(false); }
  };

  const handleUnlink = async () => {
    if (!window.confirm('Remove GitHub link from this task?')) return;
    setSaving(true);
    try {
      await api.delete(`/tasks/${task.id}/github`);
      onLinked({ ...task, github_branch: null, github_commit_sha: null, github_commit_msg: null, github_pr_url: null });
      onClose();
    } catch { setError('Failed to unlink'); }
    finally { setSaving(false); }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const suggestedBranch = `task-${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 30)}`;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow" style={{ background: '#161b22', color: '#e6edf3' }}>
          <div className="modal-header border-0" style={{ borderBottom: '1px solid #30363d' }}>
            <div>
              <h5 className="modal-title fw-bold mb-0" style={{ color: '#e6edf3' }}>
                <svg height="18" viewBox="0 0 16 16" fill="#58a6ff" className="me-2" style={{ verticalAlign: 'middle' }}>
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                Link GitHub to Task
              </h5>
              <small style={{ color: '#8b949e' }}>{task.title}</small>
            </div>
            <button className="btn-close btn-close-white" onClick={onClose} />
          </div>

          <div className="modal-body" style={{ background: '#161b22' }}>
            {error && <div className="mb-3 p-2" style={{ background: '#1a0a0a', border: '1px solid #f85149', color: '#f85149', borderRadius: 6, fontSize: 13 }}>{error}</div>}
            {noRepo ? (
              <div className="text-center py-4">
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
                <p style={{ color: '#8b949e' }}>No GitHub repository connected.</p>
              </div>
            ) : (
              <>
                <div className="d-flex mb-3" style={{ borderBottom: '1px solid #30363d' }}>
                  {[{ key: 'branch', label: '🌿 Branch' }, { key: 'commit', label: '⏱ Commit' }, { key: 'pr', label: '🔀 Pull Request' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'transparent', border: 'none', borderBottom: tab === t.key ? '2px solid #f78166' : '2px solid transparent', color: tab === t.key ? '#e6edf3' : '#8b949e', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 500 : 400 }}>{t.label}</button>
                  ))}
                </div>

                {tab === 'branch' && (
                  <div>
                    <label style={{ color: '#8b949e', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>SELECT BRANCH</label>
                    {loadingBranches ? (
                      <div className="text-center py-3"><div className="spinner-border spinner-border-sm" style={{ color: '#58a6ff' }} /></div>
                    ) : (
                      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        <div className="p-2 mb-2 rounded" style={{ background: '#1c2d3a', border: '1px dashed #1f6feb', fontSize: 13 }}>
                          <span style={{ color: '#8b949e' }}>💡 Suggested: </span>
                          <code style={{ color: '#58a6ff' }}>{suggestedBranch}</code>
                        </div>
                        {branches.map(b => (
                          <div key={b.name} onClick={() => setSelectedBranch(b.name)} style={{ background: selectedBranch === b.name ? '#1c2d3a' : '#0d1117', border: `1px solid ${selectedBranch === b.name ? '#1f6feb' : '#30363d'}`, borderRadius: 6, padding: '10px 14px', marginBottom: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <code style={{ color: '#e6edf3', fontSize: 13 }}>{b.name}</code>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code style={{ color: '#8b949e', fontSize: 12 }}>{b.sha}</code>
                              {selectedBranch === b.name && <span style={{ background: '#1f6feb', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>✓</span>}
                            </div>
                          </div>
                        ))}
                        {branches.length === 0 && <p style={{ color: '#8b949e', textAlign: 'center', padding: 20 }}>No branches found</p>}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'commit' && (
                  <div>
                    {selectedBranch ? (
                      <>
                        <div className="mb-3 p-2 rounded" style={{ background: '#0d1117', border: '1px solid #30363d', fontSize: 13 }}>
                          <span style={{ color: '#8b949e' }}>Commits on: </span>
                          <code style={{ color: '#3fb950' }}>{selectedBranch}</code>
                          <button onClick={() => setTab('branch')} style={{ float: 'right', background: 'none', border: 'none', color: '#58a6ff', fontSize: 12, cursor: 'pointer' }}>Change branch</button>
                        </div>
                        {loadingCommits ? (
                          <div className="text-center py-3"><div className="spinner-border spinner-border-sm" style={{ color: '#58a6ff' }} /></div>
                        ) : (
                          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                            {commits.map(c => (
                              <div key={c.sha} onClick={() => { setSelectedCommit(c.sha); setSelectedCommitMsg(c.message); }} style={{ background: selectedCommit === c.sha ? '#1c2d3a' : '#0d1117', border: `1px solid ${selectedCommit === c.sha ? '#1f6feb' : '#30363d'}`, borderRadius: 6, padding: '10px 14px', marginBottom: 6, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#21262d', border: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, color: '#8b949e', flexShrink: 0 }}>
                                  {c.author?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: '#e6edf3', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</div>
                                  <div style={{ color: '#8b949e', fontSize: 12, marginTop: 2 }}>{c.author} · {timeAgo(c.date)}</div>
                                </div>
                                <code style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#8b949e', flexShrink: 0 }}>{c.sha}</code>
                              </div>
                            ))}
                            {commits.length === 0 && <p style={{ color: '#8b949e', textAlign: 'center', padding: 20 }}>No commits on this branch</p>}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p style={{ color: '#8b949e' }}>Select a branch first.</p>
                        <button onClick={() => setTab('branch')} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Go to Branches →</button>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'pr' && (
                  <div>
                    <label style={{ color: '#8b949e', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>PULL REQUEST URL</label>
                    <input type="url" value={prUrl} onChange={e => setPrUrl(e.target.value)} placeholder="https://github.com/owner/repo/pull/123"
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    <div className="mt-3 p-3 rounded" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                      <p style={{ color: '#8b949e', fontSize: 12, margin: 0, lineHeight: 1.7 }}>
                        <strong style={{ color: '#e6edf3' }}>💡 Auto-status tip:</strong> Name your branch <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 4, color: '#58a6ff' }}>task-{task.id}-*</code> and click <strong style={{ color: '#e6edf3' }}>↻ Sync</strong> on the card to auto-update status.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer border-0" style={{ background: '#161b22', borderTop: '1px solid #30363d' }}>
            <div style={{ flex: 1 }}>
              {(task.github_branch || task.github_commit_sha) && (
                <button onClick={handleUnlink} disabled={saving} style={{ background: 'transparent', border: '1px solid #f85149', color: '#f85149', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Unlink GitHub</button>
              )}
            </div>
            <button onClick={onClose} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, marginRight: 8 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || noRepo} style={{ background: saving ? '#21262d' : '#238636', border: `1px solid ${saving ? '#30363d' : '#2ea043'}`, color: saving ? '#484f58' : '#fff', borderRadius: 6, padding: '6px 16px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
              {saving ? 'Saving...' : 'Save Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GitHub Badge ─────────────────────────────────────────────────────────────
function GitHubBadge({ task, onUpdated }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async (e) => {
    e.stopPropagation();
    if (!task.github_branch) return;
    setSyncing(true);
    try {
      const res = await api.post('/tasks/sync-branch', { branch: task.github_branch, action: 'opened' });
      if (res.data.newStatus) onUpdated({ ...task, status: res.data.newStatus });
    } catch {}
    finally { setSyncing(false); }
  };

  if (!task.github_branch && !task.github_commit_sha) return null;

  return (
    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f0f0f0' }}>
      {task.github_branch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <svg height="11" viewBox="0 0 16 16" fill="#3fb950">
            <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 019 8.5H7.5a1 1 0 000 2h2a.75.75 0 010 1.5h-2a2.5 2.5 0 010-5H9a1 1 0 000-2H6.823A2.251 2.251 0 114.25 3.25v.006a.75.75 0 001.5 0v-.006A.75.75 0 016.5 3a.75.75 0 10-1.5 0 2.25 2.25 0 002.25 2.25H9a2.5 2.5 0 012.5 2.5v.872a2.25 2.25 0 11-1.5 0V7.75A1 1 0 009 6.75H7.5A2.5 2.5 0 015 4.25V4.13A2.251 2.251 0 114.25 2a2.25 2.25 0 012.25 2.25v.117z"/>
          </svg>
          <code style={{ fontSize: 10, color: '#3fb950', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{task.github_branch}</code>
          <button onClick={handleSync} disabled={syncing} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '1px 5px', fontSize: 10, cursor: 'pointer', color: '#6c757d' }}>
            {syncing ? '⟳' : '↻ Sync'}
          </button>
        </div>
      )}
      {task.github_commit_sha && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <code style={{ fontSize: 10, color: '#8b949e' }}>{task.github_commit_sha}</code>
          {task.github_commit_msg && <span style={{ fontSize: 10, color: '#adb5bd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{task.github_commit_msg}</span>}
        </div>
      )}
      {task.github_pr_url && (
        <a href={task.github_pr_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'block', marginTop: 3, fontSize: 10, color: '#6f42c1', textDecoration: 'none' }}>🔀 View PR ↗</a>
      )}
    </div>
  );
}

// ─── Main ProjectView ─────────────────────────────────────────────────────────
function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [project, setProject]               = useState(null);
  const [tasks, setTasks]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showTaskModal, setShowTaskModal]   = useState(false);
  const [activeColumn, setActiveColumn]     = useState('backlog');
  const [activeTab, setActiveTab]           = useState('kanban');
  const [taskForm, setTaskForm]             = useState({ title: '', description: '', priority: 'p3', story_points: 0 });
  const [creating, setCreating]             = useState(false);
  const [draggedTask, setDraggedTask]       = useState(null);
  const [searchText, setSearchText]         = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [expandedTask, setExpandedTask]     = useState(null);
  const [githubLinkTask, setGithubLinkTask] = useState(null);
  const [aiDropdown, setAiDropdown]         = useState(false);
  const [showBreakdown, setShowBreakdown]   = useState(false);
  const [breakdownInput, setBreakdownInput] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownTasks, setBreakdownTasks] = useState([]);
  const [breakdownSelected, setBreakdownSelected] = useState({});
  const [breakdownCreating, setBreakdownCreating] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [id]); // eslint-disable-line

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_project', id);
    socket.on('task_updated', (data) => {
      setTasks(prev => prev.map(t => t.id === data.taskId ? { ...t, status: data.newStatus } : t));
    });
    socket.on('new_task', (task) => setTasks(prev => [...prev, task]));
    return () => {
      socket.emit('leave_project', id);
      socket.off('task_updated');
      socket.off('new_task');
    };
  }, [socket, id]);

  const fetchProject = async () => {
    try { const res = await api.get(`/projects/${id}`); setProject(res.data); }
    catch (err) { console.error(err); }
  };

  const fetchTasks = async () => {
    try { const res = await api.get(`/tasks/project/${id}`); setTasks(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/tasks', { ...taskForm, project_id: id, status: activeColumn });
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'p3', story_points: 0 });
      fetchTasks();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleDragStart = (task) => setDraggedTask(task);

  const handleDrop = async (newStatus) => {
    if (!draggedTask || draggedTask.status === newStatus) return;
    try {
      await api.patch(`/tasks/${draggedTask.id}/status`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t));
      if (socket) socket.emit('task_status_changed', { projectId: id, taskId: draggedTask.id, newStatus });
    } catch (err) { console.error(err); }
    setDraggedTask(null);
  };

  const handleGithubLinked = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const getFilteredTasks = () => tasks.filter(task => {
    const matchSearch   = !searchText || task.title.toLowerCase().includes(searchText.toLowerCase()) || (task.description || '').toLowerCase().includes(searchText.toLowerCase());
    const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchStatus   = filterStatus   === 'all' || task.status   === filterStatus;
    const matchAssignee = filterAssignee === 'all' || (filterAssignee === 'unassigned' ? !task.assigned_to : task.assigned_to_name === filterAssignee);
    return matchSearch && matchPriority && matchStatus && matchAssignee;
  });

  const getTasksByStatus = (status) => getFilteredTasks().filter(t => t.status === status);

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-primary" />
    </div>
  );

  return (
    <div className="min-vh-100 bg-body">

      {/* ── Navbar ── */}
      <nav className="navbar navbar-dark bg-primary px-3 py-0" style={{ minHeight: 56, position: 'relative', zIndex: 1050 }}>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/dashboard')}>← Back</button>
          <span className="navbar-brand fw-bold mb-0 fs-6">{project?.name}</span>
          <span className={`badge ${project?.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{project?.status}</span>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
          <NotificationBell />
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate(`/members/${id}`)}>👥 Members</button>
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate(`/github/${id}`)}>🐙 GitHub</button>
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate(`/sprints/${id}`)}>🏃 Sprints</button>
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate(`/analytics/${id}`)}>📊 Analytics</button>
          <button className="btn btn-outline-light btn-sm" onClick={() => navigate(`/handoff/${id}`)}>🤖 Handoffs</button>

         {/* ── AI Tools dropdown ── */}
<div className="position-relative">
  <button
    className="btn btn-warning btn-sm fw-semibold"
    onClick={() => setAiDropdown(prev => !prev)}
  >
    ✨ AI Tools ▾
  </button>
  {aiDropdown && (
    <>
      {/* Invisible overlay to close dropdown when clicking outside */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={() => setAiDropdown(false)}
      />
      <div style={{
        position: 'absolute', right: 0, top: '110%', zIndex: 9999,
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 10, minWidth: 220,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>
        {[
          { icon: '💬', label: 'AI Project Chat',  sub: 'Ask about your codebase',    path: `/ai-chat/${id}` },
          { icon: '🔍', label: 'PR Quality Gate',  sub: 'AI review any pull request',  path: `/pr-review/${id}` },
          { icon: '💥', label: 'Impact Analyser',  sub: 'What breaks if file changes', path: `/impact/${id}` },
          { icon: '🧩', label: 'AI Task Breakdown', sub: 'Generate tasks from a feature', action: () => { setAiDropdown(false); setShowBreakdown(true); } },
        ].map((item, i) => (
          <div
            key={i}
            role="button"
            onMouseDown={() => { if (item.action) item.action(); else { setAiDropdown(false); navigate(item.path); } }}
            style={{
              width: '100%', background: 'transparent',
              borderBottom: i < 3 ? '1px solid #21262d' : 'none',
              color: '#e6edf3', padding: '12px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1c2128'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{item.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )}
</div>
          <button className="btn btn-light btn-sm fw-semibold" onClick={() => setShowTaskModal(true)}>+ Add Task</button>
        </div>
      </nav>

      <div className="container-fluid px-4 mt-3">

        {/* Project meta */}
        <div className="row mb-3">
          <div className="col">
            <p className="text-muted mb-1">{project?.description}</p>
            <div className="d-flex gap-3 text-muted small flex-wrap">
              <span>👥 {project?.members?.length} members</span>
              <span>📋 {tasks.length} tasks</span>
              <span>✅ {tasks.filter(t => t.status === 'done').length} done</span>
              <span style={{ color: '#3fb950' }}>🔗 {tasks.filter(t => t.github_branch).length} linked to GitHub</span>
              {project?.deadline && <span>📅 Due: {new Date(project.deadline).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>

        {/* Filters */}
        {activeTab === 'kanban' && (
          <div className="card border-0 shadow-sm mb-3 p-3">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">🔍</span>
                  <input type="text" className="form-control border-start-0" placeholder="Search tasks..."
                    value={searchText} onChange={e => setSearchText(e.target.value)} />
                  {searchText && <button className="btn btn-outline-secondary" onClick={() => setSearchText('')}>✕</button>}
                </div>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="all">All Priorities</option>
                  <option value="p1">🔴 Critical</option>
                  <option value="p2">🟡 High</option>
                  <option value="p3">🔵 Medium</option>
                  <option value="p4">⚪ Low</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                  <option value="all">All Members</option>
                  <option value="unassigned">Unassigned</option>
                  {project?.members?.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-outline-secondary w-100"
                  onClick={() => { setSearchText(''); setFilterPriority('all'); setFilterStatus('all'); setFilterAssignee('all'); }}>
                  Reset Filters
                </button>
              </div>
            </div>
            {(searchText || filterPriority !== 'all' || filterStatus !== 'all' || filterAssignee !== 'all') && (
              <div className="mt-2">
                <small className="text-muted">Showing <strong>{getFilteredTasks().length}</strong> of <strong>{tasks.length}</strong> tasks</small>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>📋 Kanban Board</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'codereview' ? 'active' : ''}`} onClick={() => setActiveTab('codereview')}>🔍 Code Review</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'githubcode' ? 'active' : ''}`} onClick={() => setActiveTab('githubcode')}>🐙 GitHub Code</button>
          </li>
        </ul>

        {activeTab === 'codereview' && <CodeReview taskId={tasks[0]?.id || null} socket={socket} projectId={id} projectTasks={tasks} />}
        {activeTab === 'githubcode' && <GitHubCodeReview projectId={id} socket={socket} />}

        {/* Kanban */}
        {activeTab === 'kanban' && (
          <div className="d-flex gap-3 overflow-auto pb-4" style={{ minHeight: '70vh' }}>
            {COLUMNS.map(col => (
              <div key={col.id} className="flex-shrink-0" style={{ width: '290px' }}
                onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.id)}>

                <div className="rounded-top p-2 d-flex justify-content-between align-items-center" style={{ backgroundColor: col.color }}>
                  <span className="text-white fw-semibold">{col.label}</span>
                  <span className="badge bg-white text-dark">{getTasksByStatus(col.id).length}</span>
                </div>

                <div className="bg-white rounded-bottom p-2 border border-top-0" style={{ minHeight: '400px' }}>
                  {getTasksByStatus(col.id).map(task => (
                    <div key={task.id} className="card mb-2 shadow-sm border-0"
                      draggable onDragStart={() => handleDragStart(task)} style={{ cursor: 'grab' }}>
                      <div className="card-body p-2">

                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <p className="mb-0 fw-semibold small">{task.title}</p>
                          <span className={`badge bg-${PRIORITY_COLORS[task.priority]} ms-1`} style={{ fontSize: '10px' }}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-muted mb-1" style={{ fontSize: '11px' }}>
                            {task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}
                          </p>
                        )}

                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {task.assigned_to_name ? `👤 ${task.assigned_to_name}` : '👤 Unassigned'}
                          </span>
                          {task.story_points > 0 && (
                            <span className="badge bg-light text-dark border" style={{ fontSize: '10px' }}>{task.story_points} pts</span>
                          )}
                        </div>

                        <GitHubBadge task={task} onUpdated={handleGithubLinked} />

                        <div className="d-flex gap-1 mt-2 flex-wrap align-items-center">
                          <button className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: '11px' }}
                            onClick={e => { e.stopPropagation(); setExpandedTask(expandedTask === task.id ? null : task.id); }}>
                            💬 Comments
                          </button>
                          <button className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: '11px' }}
                            onClick={e => { e.stopPropagation(); setExpandedTask(expandedTask === `attach_${task.id}` ? null : `attach_${task.id}`); }}>
                            📎 Files
                          </button>
                          <button
                            className="btn btn-link btn-sm p-0 ms-auto"
                            style={{ fontSize: '11px', color: task.github_branch ? '#3fb950' : '#8b949e', textDecoration: 'none' }}
                            onClick={e => { e.stopPropagation(); setGithubLinkTask(task); }}
                          >
                            <svg height="11" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 3, verticalAlign: 'middle' }}>
                              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                            </svg>
                            {task.github_branch ? 'Linked ✓' : 'Link GitHub'}
                          </button>
                        </div>

                        {expandedTask === task.id && (
                          <div onClick={e => e.stopPropagation()}><TaskComments taskId={task.id} /></div>
                        )}
                        {expandedTask === `attach_${task.id}` && (
                          <div onClick={e => e.stopPropagation()}><TaskAttachments taskId={task.id} /></div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button className="btn btn-light btn-sm w-100 text-muted mt-1"
                    onClick={() => { setActiveColumn(col.id); setShowTaskModal(true); }}
                    style={{ border: '1px dashed #ccc' }}>
                    + Add task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add Task to {COLUMNS.find(c => c.id === activeColumn)?.label}</h5>
                <button className="btn-close" onClick={() => setShowTaskModal(false)} />
              </div>
              <form onSubmit={handleCreateTask}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Task Title *</label>
                    <input type="text" className="form-control" placeholder="e.g. Implement login API"
                      value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea className="form-control" rows="2" placeholder="What needs to be done?"
                      value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Priority</label>
                      <select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                        <option value="p1">Critical</option>
                        <option value="p2">High</option>
                        <option value="p3">Medium</option>
                        <option value="p4">Low</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Story Points</label>
                      <input type="number" className="form-control" min="0" max="100"
                        value={taskForm.story_points} onChange={e => setTaskForm({ ...taskForm, story_points: parseInt(e.target.value) })} />
                    </div>
                  </div>
                  <div className="p-2 rounded" style={{ background: '#f8f9fa', border: '1px dashed #dee2e6' }}>
                    <small className="text-muted">💡 After creating, click <strong>Link GitHub</strong> on the card to link a branch or commit.</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Adding...' : 'Add Task'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Link Modal */}
      {githubLinkTask && (
        <GitHubLinkModal
          task={githubLinkTask}
          projectId={id}
          onClose={() => setGithubLinkTask(null)}
          onLinked={handleGithubLinked}
        />
      )}

      {/* AI Task Breakdown Modal */}
      {showBreakdown && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow" style={{ background: '#161b22', color: '#e6edf3' }}>
              <div className="modal-header border-0" style={{ borderBottom: '1px solid #30363d' }}>
                <h5 className="modal-title fw-bold" style={{ color: '#e6edf3' }}>🧩 AI Task Breakdown</h5>
                <button className="btn-close btn-close-white" onClick={() => { setShowBreakdown(false); setBreakdownTasks([]); setBreakdownInput(''); }} />
              </div>
              <div className="modal-body">
                {breakdownTasks.length === 0 ? (
                  <>
                    <label style={{ color: '#8b949e', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>DESCRIBE YOUR FEATURE</label>
                    <textarea
                      rows={4}
                      value={breakdownInput}
                      onChange={e => setBreakdownInput(e.target.value)}
                      placeholder="e.g. Add user authentication with login, registration, password reset, and OAuth support..."
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '12px', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div className="mt-3 p-3 rounded" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                      <p style={{ color: '#8b949e', fontSize: 12, margin: 0 }}>
                        <strong style={{ color: '#e6edf3' }}>💡 Tip:</strong> Be as specific as possible. Include details about frontend, backend, and any integrations needed.
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 12 }}>AI generated {breakdownTasks.length} tasks. Select the ones you want to create.</p>
                    {breakdownTasks.map((t, i) => (
                      <div key={i} style={{ background: '#0d1117', border: '1px solid ' + (breakdownSelected[i] ? '#238636' : '#30363d'), borderRadius: 8, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}
                        onClick={() => setBreakdownSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <input type="checkbox" checked={!!breakdownSelected[i]} readOnly style={{ marginTop: 3, accentColor: '#238636' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#e6edf3' }}>{t.title}</div>
                            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{t.description}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: t.priority === 'p1' ? '#da3633' : t.priority === 'p2' ? '#d29922' : '#388bfd', color: '#fff' }}>
                                {t.priority === 'p1' ? 'Critical' : t.priority === 'p2' ? 'High' : t.priority === 'p3' ? 'Medium' : 'Low'}
                              </span>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#238636', color: '#fff' }}>{t.story_points} pts</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0" style={{ borderTop: '1px solid #30363d' }}>
                {breakdownTasks.length === 0 ? (
                  <>
                    <button onClick={() => { setShowBreakdown(false); setBreakdownInput(''); }} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    <button
                      disabled={!breakdownInput.trim() || breakdownLoading}
                      onClick={async () => {
                        setBreakdownLoading(true);
                        try {
                          const res = await api.post('/ai/breakdown', { project_id: id, feature_description: breakdownInput });
                          if (res.data.tasks && res.data.tasks.length) {
                            setBreakdownTasks(res.data.tasks);
                            const sel = {};
                            res.data.tasks.forEach(function(t, i) { sel[i] = true; });
                            setBreakdownSelected(sel);
                          } else {
                            alert(res.data.message || 'No tasks generated');
                          }
                        } catch (err) { alert('AI breakdown failed'); }
                        finally { setBreakdownLoading(false); }
                      }}
                      style={{ background: breakdownLoading ? '#21262d' : '#238636', border: '1px solid ' + (breakdownLoading ? '#30363d' : '#2ea043'), color: breakdownLoading ? '#484f58' : '#fff', borderRadius: 6, padding: '6px 16px', cursor: breakdownLoading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
                    >
                      {breakdownLoading ? '⏳ Generating...' : '✨ Generate Tasks'}
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#8b949e', fontSize: 12, marginRight: 'auto' }}>
                      {Object.values(breakdownSelected).filter(Boolean).length} of {breakdownTasks.length} selected
                    </span>
                    <button onClick={() => { setBreakdownTasks([]); setBreakdownSelected({}); }} style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>← Back</button>
                    <button
                      disabled={breakdownCreating || Object.values(breakdownSelected).filter(Boolean).length === 0}
                      onClick={async () => {
                        setBreakdownCreating(true);
                        try {
                          for (let i = 0; i < breakdownTasks.length; i++) {
                            if (breakdownSelected[i]) {
                              const t = breakdownTasks[i];
                              await api.post('/tasks', {
                                project_id: id,
                                title: t.title,
                                description: t.description,
                                priority: t.priority,
                                story_points: t.story_points,
                                status: 'backlog',
                              });
                            }
                          }
                          setShowBreakdown(false);
                          setBreakdownTasks([]);
                          setBreakdownInput('');
                          setBreakdownSelected({});
                          fetchTasks();
                        } catch (err) { alert('Failed to create some tasks'); }
                        finally { setBreakdownCreating(false); }
                      }}
                      style={{ background: breakdownCreating ? '#21262d' : '#238636', border: '1px solid ' + (breakdownCreating ? '#30363d' : '#2ea043'), color: breakdownCreating ? '#484f58' : '#fff', borderRadius: 6, padding: '6px 16px', cursor: breakdownCreating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}
                    >
                      {breakdownCreating ? 'Creating...' : 'Create ' + Object.values(breakdownSelected).filter(Boolean).length + ' Tasks'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectView;