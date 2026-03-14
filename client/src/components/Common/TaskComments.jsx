import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function TaskComments({ taskId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (taskId) fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/comments/${taskId}`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await api.post('/comments', {
        task_id: taskId,
        content: newComment
      });
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="mt-3">
      <h6 className="fw-bold mb-3">
        💬 Comments
        <span className="badge bg-secondary ms-2">{comments.length}</span>
      </h6>

      {/* Comments List */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="mb-3">
        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted py-3">
            <p className="mb-0 small">No comments yet — be the first!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="d-flex gap-2 mb-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                style={{
                  width: '32px', height: '32px',
                  backgroundColor: `hsl(${comment.user_id * 47 % 360}, 60%, 50%)`,
                  fontSize: '12px'
                }}
              >
                {comment.user_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-grow-1">
                <div className="bg-light rounded p-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <small className="fw-bold">{comment.user_name}</small>
                    <div className="d-flex align-items-center gap-2">
                      <small className="text-muted">{getTimeAgo(comment.created_at)}</small>
                      {comment.user_id === user?.id && (
                        <button
                          className="btn btn-link btn-sm text-danger p-0"
                          style={{ fontSize: '11px' }}
                          onClick={() => handleDelete(comment.id)}
                        >
                          delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mb-0 small mt-1">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment */}
      <form onSubmit={handlePost}>
        <div className="d-flex gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
            style={{
              width: '32px', height: '32px',
              backgroundColor: `hsl(${user?.id * 47 % 360}, 60%, 50%)`,
              fontSize: '12px'
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-grow-1">
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Write a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={posting || !newComment.trim()}
              >
                {posting ? '...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default TaskComments;