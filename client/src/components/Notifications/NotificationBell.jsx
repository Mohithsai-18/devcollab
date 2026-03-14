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
        className="btn btn-outline-light btn-sm position-relative"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ width: '38px', height: '38px', padding: '0' }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '10px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="position-absolute end-0 mt-1 bg-white rounded shadow-lg border"
          style={{ width: '360px', zIndex: 1000 }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
            <h6 className="mb-0 fw-bold">
              Notifications
              {unreadCount > 0 && (
                <span className="badge bg-danger ms-2">{unreadCount}</span>
              )}
            </h6>
            {unreadCount > 0 && (
              <button
                className="btn btn-link btn-sm text-decoration-none p-0"
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
                <div className="spinner-border spinner-border-sm text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: '40px' }}>🔔</div>
                <p className="mt-2 mb-0">No notifications yet</p>
                <small>You'll see updates here</small>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`d-flex gap-3 p-3 border-bottom ${!notification.is_read ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div style={{ fontSize: '20px' }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-grow-1">
                    <p className={`mb-0 small ${!notification.is_read ? 'fw-semibold' : ''}`}>
                      {notification.message}
                    </p>
                    <small className="text-muted">
                      {getTimeAgo(notification.created_at)}
                    </small>
                  </div>
                  {!notification.is_read && (
                    <div
                      className="rounded-circle bg-primary"
                      style={{ width: '8px', height: '8px', marginTop: '6px', flexShrink: 0 }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 text-center border-top">
              <button
                className="btn btn-link btn-sm text-decoration-none"
                onClick={fetchNotifications}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;