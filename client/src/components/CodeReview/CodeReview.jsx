import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function CodeReview({ taskId, socket, projectId, projectTasks = [] }) {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState([]);
  const [comments, setComments] = useState({});
  const [showAddSnippet, setShowAddSnippet] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [snippetForm, setSnippetForm] = useState({
    language: 'javascript', code_content: ''
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchSnippets();
    }
  }, [taskId]);

  useEffect(() => {
    if (projectTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(projectTasks[0].id);
    }
  }, [projectTasks]);

  useEffect(() => {
    if (socket) {
      socket.on('code_comment_added', (data) => {
        if (activeSnippet && data.snippetId === activeSnippet.id) {
          fetchComments(activeSnippet.id);
        }
      });
      return () => socket.off('code_comment_added');
    }
  }, [socket, activeSnippet]);

  const fetchSnippets = async () => {
    try {
      const tid = selectedTaskId || taskId;
      if (!tid) return;
      const res = await api.get(`/codereview/snippets/task/${tid}`);
      setSnippets(res.data);
      if (res.data.length > 0) {
        setActiveSnippet(res.data[0]);
        fetchComments(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async (snippetId) => {
    try {
      const res = await api.get(`/codereview/comments/${snippetId}`);
      setComments(prev => ({ ...prev, [snippetId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSnippet = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const tid = selectedTaskId || taskId;
      if (!tid) {
        alert('Please select a task first.');
        setAdding(false);
        return;
      }
      await api.post('/codereview/snippets', {
        task_id: tid,
        language: snippetForm.language,
        code_content: snippetForm.code_content
      });
      setShowAddSnippet(false);
      setSnippetForm({ language: 'javascript', code_content: '' });
      fetchSnippets();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !activeSnippet) return;
    try {
      const res = await api.post('/codereview/comments', {
        snippet_id: activeSnippet.id,
        content: commentText,
        line_number: selectedLine
      });
      setComments(prev => ({
        ...prev,
        [activeSnippet.id]: [...(prev[activeSnippet.id] || []), res.data.comment]
      }));
      setCommentText('');
      setSelectedLine(null);
      if (socket) {
        socket.emit('new_code_comment', {
          projectId,
          snippetId: activeSnippet.id,
          comment: res.data.comment
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (commentId) => {
    try {
      await api.patch(`/codereview/comments/${commentId}/resolve`);
      setComments(prev => ({
        ...prev,
        [activeSnippet.id]: prev[activeSnippet.id].map(c =>
          c.id === commentId ? { ...c, status: 'resolved' } : c
        )
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskChange = (tid) => {
    setSelectedTaskId(tid);
    setSnippets([]);
    setActiveSnippet(null);
    setComments({});
    setTimeout(() => {
      api.get(`/codereview/snippets/task/${tid}`)
        .then(res => {
          setSnippets(res.data);
          if (res.data.length > 0) {
            setActiveSnippet(res.data[0]);
            fetchComments(res.data[0].id);
          }
        })
        .catch(console.error);
    }, 100);
  };

  const activeComments = activeSnippet ? (comments[activeSnippet.id] || []) : [];
  const openComments = activeComments.filter(c => c.status === 'open');
  const resolvedComments = activeComments.filter(c => c.status === 'resolved');

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <h6 className="fw-bold mb-0">
            Code Review
            {activeSnippet && openComments.length > 0 && (
              <span className="badge bg-warning text-dark ms-2">
                {openComments.length} open
              </span>
            )}
          </h6>
          {/* Task selector */}
          {projectTasks.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ width: '200px' }}
              value={selectedTaskId || ''}
              onChange={e => handleTaskChange(e.target.value)}
            >
              {projectTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddSnippet(true)}
        >
          + Add Code
        </button>
      </div>

      {/* Snippet Tabs */}
      {snippets.length > 0 && (
        <div className="d-flex gap-2 mb-3 overflow-auto">
          {snippets.map((s, i) => (
            <button
              key={s.id}
              className={`btn btn-sm ${activeSnippet?.id === s.id ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => {
                setActiveSnippet(s);
                fetchComments(s.id);
              }}
            >
              {s.language} #{i + 1}
              {s.open_comments > 0 && (
                <span className="badge bg-warning text-dark ms-1">{s.open_comments}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Code + Comments Area */}
      {activeSnippet ? (
        <div className="row">
          {/* Code Panel */}
          <div className="col-md-7">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-dark text-white d-flex justify-content-between py-2">
                <small className="fw-semibold">{activeSnippet.language}</small>
                <small className="text-muted">by {activeSnippet.created_by_name}</small>
              </div>
              <div style={{ position: 'relative', overflowX: 'auto' }}>
                {activeSnippet.code_content.split('\n').map((line, idx) => {
                  const lineNum = idx + 1;
                  const lineComments = activeComments.filter(
                    c => c.line_number === lineNum && c.status === 'open'
                  );
                  return (
                    <div
                      key={idx}
                      className={`d-flex align-items-start ${selectedLine === lineNum ? 'bg-warning bg-opacity-25' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedLine(lineNum === selectedLine ? null : lineNum)}
                    >
                      <span
                        className="text-muted px-2 py-0 border-end"
                        style={{
                          minWidth: '40px', fontSize: '12px',
                          fontFamily: 'monospace', userSelect: 'none',
                          background: lineComments.length > 0 ? '#fff3cd' : '#f8f9fa'
                        }}
                      >
                        {lineNum}
                        {lineComments.length > 0 && (
                          <span className="ms-1 text-warning">●</span>
                        )}
                      </span>
                      <pre
                        className="mb-0 px-2 flex-grow-1"
                        style={{
                          fontSize: '12px', fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap', background: 'transparent'
                        }}
                      >
                        {line || ' '}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Comment Box */}
            {selectedLine && (
              <div className="card mt-2 border-warning">
                <div className="card-body py-2">
                  <small className="text-muted fw-semibold">
                    Comment on line {selectedLine}:
                  </small>
                  <div className="d-flex gap-2 mt-1">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Add your comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    />
                    <button className="btn btn-warning btn-sm" onClick={handleAddComment}>
                      Post
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setSelectedLine(null); setCommentText(''); }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comments Panel */}
          <div className="col-md-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-light py-2">
                <small className="fw-bold">
                  Comments ({openComments.length} open, {resolvedComments.length} resolved)
                </small>
              </div>
              <div className="card-body p-2 overflow-auto" style={{ maxHeight: '400px' }}>
                {activeComments.length === 0 ? (
                  <div className="text-center text-muted mt-3">
                    <small>Click a line number to add a comment</small>
                  </div>
                ) : (
                  activeComments.map(comment => (
                    <div
                      key={comment.id}
                      className={`card mb-2 border-0 ${comment.status === 'resolved' ? 'opacity-50' : ''}`}
                      style={{ background: comment.status === 'resolved' ? '#f8f9fa' : '#fff3cd' }}
                    >
                      <div className="card-body p-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <small className="fw-bold">{comment.user_name}</small>
                            {comment.line_number && (
                              <span className="badge bg-dark ms-1" style={{ fontSize: '10px' }}>
                                Line {comment.line_number}
                              </span>
                            )}
                          </div>
                          {comment.status === 'open' && (
                            <button
                              className="btn btn-outline-success btn-sm py-0"
                              style={{ fontSize: '10px' }}
                              onClick={() => handleResolve(comment.id)}
                            >
                              Resolve
                            </button>
                          )}
                          {comment.status === 'resolved' && (
                            <span className="badge bg-success" style={{ fontSize: '10px' }}>
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="mb-0 mt-1" style={{ fontSize: '12px' }}>
                          {comment.content}
                        </p>
                        <small className="text-muted" style={{ fontSize: '10px' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-muted py-4 border rounded">
          <p className="mb-1">No code snippets yet</p>
          <small>Click "+ Add Code" to submit code for review</small>
        </div>
      )}

      {/* Add Snippet Modal */}
      {showAddSnippet && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Submit Code for Review</h5>
                <button className="btn-close" onClick={() => setShowAddSnippet(false)} />
              </div>
              <form onSubmit={handleAddSnippet}>
                <div className="modal-body">
                  {projectTasks.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Link to Task</label>
                      <select
                        className="form-select"
                        value={selectedTaskId || ''}
                        onChange={e => setSelectedTaskId(e.target.value)}
                      >
                        {projectTasks.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Language</label>
                    <select
                      className="form-select"
                      value={snippetForm.language}
                      onChange={e => setSnippetForm({ ...snippetForm, language: e.target.value })}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="css">CSS</option>
                      <option value="html">HTML</option>
                      <option value="sql">SQL</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Code</label>
                    <textarea
                      className="form-control"
                      rows="12"
                      style={{ fontFamily: 'monospace', fontSize: '13px' }}
                      placeholder="Paste your code here..."
                      value={snippetForm.code_content}
                      onChange={e => setSnippetForm({ ...snippetForm, code_content: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowAddSnippet(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={adding}>
                    {adding ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodeReview;