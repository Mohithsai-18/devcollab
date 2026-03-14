const pool = require('../config/db');

// GET ALL NOTIFICATIONS FOR LOGGED IN USER
const getNotifications = async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// MARK ONE AS READ
const markAsRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=true WHERE id=? AND user_id=?',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// MARK ALL AS READ
const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=true WHERE user_id=?',
      [req.userId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };