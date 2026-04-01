import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const { socket } = useSocket();
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
      });
      return () => socket.off('new_notification');
    }
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_assigned: '📋',
      comment_added: '💬',
      sprint_started: '🏃',
      sprint_completed: '✅',
      member_added: '👥',
      task_completed: '🎉',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        className="btn position-relative"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: '38px', height: '38px', padding: '0',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px', fontSize: '16px',
          color: '#e2e8f0',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
            style={{
              fontSize: '10px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: '2px solid #020617',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setShowDropdown(false)}
          />
          <div
            className="position-absolute end-0 mt-2"
            style={{
              width: '380px', zIndex: 999,
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              className="d-flex justify-content-between align-items-center p-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
            >
              <h6 className="mb-0 fw-bold text-white">
                Notifications
                {unreadCount > 0 && (
                  <span className="badge ms-2" style={{
                    background: 'rgba(239,68,68,0.2)', color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.3)', fontSize: '11px',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </h6>
              {unreadCount > 0 && (
                <button
                  className="btn btn-link btn-sm text-decoration-none p-0"
                  style={{ color: '#60a5fa', fontSize: '0.8rem' }}
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" style={{ color: '#60a5fa' }} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-5" style={{ color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', opacity: 0.5 }}>🔔</div>
                  <p className="mt-2 mb-0">No notifications yet</p>
                  <small>You'll see updates here</small>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className="d-flex gap-3 p-3"
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: !notification.is_read ? 'rgba(59,130,246,0.05)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = !notification.is_read ? 'rgba(59,130,246,0.05)' : 'transparent'}
                  >
                    <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <p className={`mb-0 small ${!notification.is_read ? 'fw-semibold' : ''}`} style={{ color: '#e2e8f0' }}>
                        {notification.message}
                      </p>
                      <small style={{ color: '#64748b' }}>
                        {getTimeAgo(notification.created_at)}
                      </small>
                    </div>
                    {!notification.is_read && (
                      <div
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: '8px', height: '8px', marginTop: '6px',
                          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  className="btn btn-link btn-sm text-decoration-none"
                  style={{ color: '#60a5fa' }}
                  onClick={fetchNotifications}
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;