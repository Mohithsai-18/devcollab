const pool = require('../config/db');

const getComments = async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT tc.*, u.name as user_name
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at ASC`,
      [req.params.taskId]
    );
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addComment = async (req, res) => {
  try {
    const { task_id, content } = req.body;
    const [result] = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)`,
      [task_id, req.userId, content]
    );
    const [comments] = await pool.query(
      `SELECT tc.*, u.name as user_name
       FROM task_comments tc
       LEFT JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.insertId]
    );
    res.status(201).json(comments[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteComment = async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM task_comments WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getComments, addComment, deleteComment };