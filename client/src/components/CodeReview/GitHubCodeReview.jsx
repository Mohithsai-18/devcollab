import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function GitHubCodeReview({ projectId, socket }) {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [comments, setComments] = useState({});
  const [selectedLine, setSelectedLine] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [connected, setConnected] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchFiles('');
  }, [projectId]);

  const fetchFiles = async (path) => {
    setLoading(true);
    try {
      const res = await api.get(`/github/files/${projectId}?path=${path}`);
      setFiles(res.data);
      setCurrentPath(path);
      setConnected(true);
    } catch (err) {
      if (err.response?.status === 404) setConnected(false);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (file) => {
    if (file.type === 'dir') {
      setPathHistory(prev => [...prev, currentPath]);
      fetchFiles(file.path);
      return;
    }
    setLoadingFile(true);
    setSelectedFile(file);
    try {
      const res = await api.get(`/github/content/${projectId}?path=${file.path}`);
      setFileContent(res.data.content);
      setSelectedLine(null);
      setCommentText('');
    } catch (err) {
      setFileContent('// Could not load file content');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleBack = () => {
    const prev = pathHistory[pathHistory.length - 1];
    setPathHistory(p => p.slice(0, -1));
    setSelectedFile(null);
    setFileContent('');
    fetchFiles(prev || '');
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedFile) return;
    setPosting(true);
    try {
      const res = await api.post('/codereview/comments', {
        snippet_id: selectedFile.path,
        content: commentText,
        line_number: selectedLine
      });
      const key = selectedFile.path;
      setComments(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), {
          id: Date.now(),
          content: commentText,
          line_number: selectedLine,
          user_name: user?.name,
          created_at: new Date().toISOString(),
          status: 'open'
        }]
      }));
      setCommentText('');
      setSelectedLine(null);
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const getLanguage = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    const map = {
      js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c',
      html: 'html', css: 'css', json: 'json', md: 'markdown',
      sql: 'sql', sh: 'bash', yml: 'yaml', yaml: 'yaml'
    };
    return map[ext] || 'text';
  };

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    const icons = {
      js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
      py: '🐍', java: '☕', html: '🌐', css: '🎨',
      json: '📋', md: '📝', sql: '🗄️', sh: '⚙️',
      png: '🖼️', jpg: '🖼️', gif: '🖼️', svg: '🎨',
      pdf: '📄', zip: '🗜️', env: '🔒'
    };
    return icons[ext] || '📄';
  };

  const fileComments = selectedFile ? (comments[selectedFile.path] || []) : [];
  const openComments = fileComments.filter(c => c.status === 'open');

  if (!connected) {
    return (
      <div className="text-center py-5 text-muted">
        <div style={{ fontSize: '40px' }}>🐙</div>
        <h6 className="mt-2">No GitHub repository connected</h6>
        <p className="small">Connect a GitHub repo from the 🐙 GitHub tab to review code here</p>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: '70vh', overflow: 'hidden' }}>

      {/* File Tree Panel */}
      <div
        className="border-end bg-white"
        style={{ width: '260px', flexShrink: 0, overflowY: 'auto' }}
      >
        <div className="p-2 border-bottom bg-light d-flex align-items-center justify-content-between">
          <small className="fw-bold text-muted">
            📁 {currentPath || 'root'}
          </small>
          {pathHistory.length > 0 && (
            <button className="btn btn-sm btn-outline-secondary py-0" onClick={handleBack}>
              ←
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" />
          </div>
        ) : (
          files.map(file => (
            <div
              key={file.path}
              className={`d-flex align-items-center gap-2 p-2 border-bottom ${selectedFile?.path === file.path ? 'bg-primary bg-opacity-10 border-start border-primary border-3' : ''}`}
              style={{ cursor: 'pointer', fontSize: '13px' }}
              onClick={() => handleFileClick(file)}
            >
              <span>{file.type === 'dir' ? '📁' : getFileIcon(file.name)}</span>
              <span className={`${file.type === 'dir' ? 'fw-semibold text-primary' : 'text-dark'} text-truncate`}>
                {file.name}
              </span>
              {file.type === 'dir' && <span className="ms-auto text-muted">›</span>}
            </div>
          ))
        )}
      </div>

      {/* Code Panel */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        {!selectedFile ? (
          <div className="d-flex align-items-center justify-content-center h-100 text-muted">
            <div className="text-center">
              <div style={{ fontSize: '40px' }}>👈</div>
              <p className="mt-2">Select a file to review</p>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column h-100">

            {/* File Header */}
            <div className="bg-dark text-white px-3 py-2 d-flex align-items-center justify-content-between flex-shrink-0">
              <div className="d-flex align-items-center gap-2">
                <span>{getFileIcon(selectedFile.name)}</span>
                <small className="fw-semibold">{selectedFile.path}</small>
                <span className="badge bg-secondary" style={{ fontSize: '10px' }}>
                  {getLanguage(selectedFile.name)}
                </span>
              </div>
              {openComments.length > 0 && (
                <span className="badge bg-warning text-dark">
                  {openComments.length} comments
                </span>
              )}
            </div>

            {/* Code + Comments */}
            <div className="d-flex flex-grow-1 overflow-hidden">

              {/* Code */}
              <div className="flex-grow-1 overflow-auto bg-white" style={{ fontFamily: 'monospace' }}>
                {loadingFile ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" />
                  </div>
                ) : (
                  fileContent.split('\n').map((line, idx) => {
                    const lineNum = idx + 1;
                    const lineComments = fileComments.filter(
                      c => c.line_number === lineNum && c.status === 'open'
                    );
                    const isSelected = selectedLine === lineNum;
                    return (
                      <div key={idx}>
                        <div
                          className={`d-flex align-items-start ${isSelected ? 'bg-warning bg-opacity-25' : lineComments.length > 0 ? 'bg-warning bg-opacity-10' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedLine(isSelected ? null : lineNum)}
                        >
                          <span
                            className="text-muted border-end px-2 flex-shrink-0 select-none"
                            style={{
                              minWidth: '45px', fontSize: '11px',
                              lineHeight: '1.6', userSelect: 'none',
                              background: lineComments.length > 0 ? '#fff3cd' : '#f8f9fa'
                            }}
                          >
                            {lineNum}
                            {lineComments.length > 0 && <span className="text-warning ms-1">●</span>}
                          </span>
                          <pre
                            className="mb-0 px-2 flex-grow-1"
                            style={{
                              fontSize: '12px', lineHeight: '1.6',
                              whiteSpace: 'pre', background: 'transparent',
                              margin: 0, padding: '0 8px'
                            }}
                          >
                            {line || ' '}
                          </pre>
                        </div>

                        {/* Inline comment box */}
                        {isSelected && (
                          <div className="border-top border-bottom border-warning bg-warning bg-opacity-10 p-2">
                            <small className="text-muted fw-semibold d-block mb-1">
                              Comment on line {lineNum}:
                            </small>
                            <div className="d-flex gap-2">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Write a comment..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                autoFocus
                              />
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={handleAddComment}
                                disabled={posting || !commentText.trim()}
                              >
                                {posting ? '...' : 'Post'}
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => { setSelectedLine(null); setCommentText(''); }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comments Sidebar */}
              {fileComments.length > 0 && (
                <div
                  className="border-start bg-white overflow-auto"
                  style={{ width: '280px', flexShrink: 0 }}
                >
                  <div className="p-2 border-bottom bg-light">
                    <small className="fw-bold">
                      💬 Comments ({openComments.length} open)
                    </small>
                  </div>
                  <div className="p-2">
                    {fileComments.map(comment => (
                      <div
                        key={comment.id}
                        className={`card border-0 mb-2 ${comment.status === 'resolved' ? 'opacity-50' : ''}`}
                        style={{ background: comment.status === 'resolved' ? '#f8f9fa' : '#fff3cd' }}
                      >
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-between">
                            <small className="fw-bold">{comment.user_name}</small>
                            {comment.line_number && (
                              <span className="badge bg-dark" style={{ fontSize: '10px' }}>
                                Line {comment.line_number}
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GitHubCodeReview;