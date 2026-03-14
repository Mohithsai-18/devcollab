import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function TaskAttachments({ taskId }) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (taskId) fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      const res = await api.get(`/attachments/${taskId}`);
      setAttachments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', taskId);
      const res = await api.post('/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments(prev => [res.data, ...prev]);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attachment?')) return;
    try {
      await api.delete(`/attachments/${id}`);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const res = await api.get(`/attachments/download/${attachment.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType === 'text/plain') return '📃';
    if (mimeType?.includes('zip')) return '🗜️';
    return '📎';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <h6 className="fw-bold mb-2">
        📎 Attachments
        <span className="badge bg-secondary ms-2">{attachments.length}</span>
      </h6>

      {/* Drop Zone */}
      <div
        className={`border rounded p-3 text-center mb-3 ${dragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-dashed'}`}
        style={{ borderStyle: 'dashed', cursor: 'pointer' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleUpload(file);
        }}
      >
        <input
          type="file"
          ref={fileRef}
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files[0])}
        />
        {uploading ? (
          <div>
            <div className="spinner-border spinner-border-sm text-primary me-2" />
            <small className="text-muted">Uploading...</small>
          </div>
        ) : (
          <small className="text-muted">
            📎 Click to upload or drag & drop here
            <br />
            <span style={{ fontSize: '10px' }}>PDF, Images, Word, Excel, ZIP — max 10MB</span>
          </small>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-muted text-center small">No attachments yet</p>
      ) : (
        attachments.map(attachment => (
          <div
            key={attachment.id}
            className="d-flex align-items-center gap-2 p-2 mb-1 bg-light rounded"
          >
            <span style={{ fontSize: '20px' }}>{getFileIcon(attachment.mime_type)}</span>
            <div className="flex-grow-1 overflow-hidden">
              <p className="mb-0 small fw-semibold text-truncate">
                {attachment.original_name}
              </p>
              <small className="text-muted">
                {formatSize(attachment.file_size)} · {attachment.uploaded_by_name} · {getTimeAgo(attachment.created_at)}
              </small>
            </div>
            <div className="d-flex gap-1">
              <button
                className="btn btn-outline-primary btn-sm py-0"
                style={{ fontSize: '11px' }}
                onClick={() => handleDownload(attachment)}
              >
                ↓
              </button>
              <button
                className="btn btn-outline-danger btn-sm py-0"
                style={{ fontSize: '11px' }}
                onClick={() => handleDelete(attachment.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TaskAttachments;