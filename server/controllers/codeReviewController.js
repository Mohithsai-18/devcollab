const pool = require('../config/db');

// CREATE CODE SNIPPET
const createSnippet = async (req, res) => {
  try {
    const { task_id, language, code_content } = req.body;

    const [result] = await pool.query(
      `INSERT INTO code_snippets (task_id, language, code_content, created_by)
       VALUES (?, ?, ?, ?)`,
      [task_id, language || 'javascript', code_content, req.userId]
    );

    res.status(201).json({
      message: 'Code snippet created',
      snippetId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SNIPPETS FOR A TASK
const getSnippetsByTask = async (req, res) => {
  try {
    const [snippets] = await pool.query(
      `SELECT cs.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM code_comments WHERE snippet_id = cs.id) as comment_count,
        (SELECT COUNT(*) FROM code_comments WHERE snippet_id = cs.id AND status = 'open') as open_comments
       FROM code_snippets cs
       LEFT JOIN users u ON cs.created_by = u.id
       WHERE cs.task_id = ?
       ORDER BY cs.created_at DESC`,
      [req.params.taskId]
    );
    res.json(snippets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADD COMMENT ON A LINE
const addComment = async (req, res) => {
  try {
    const { snippet_id, content, line_number, parent_comment_id } = req.body;

    const [result] = await pool.query(
      `INSERT INTO code_comments (snippet_id, user_id, content, line_number, parent_comment_id)
       VALUES (?, ?, ?, ?, ?)`,
      [snippet_id, req.userId, content, line_number || null, parent_comment_id || null]
    );

    // Get the created comment with user info
    const [comments] = await pool.query(
      `SELECT cc.*, u.name as user_name
       FROM code_comments cc
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE cc.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Comment added',
      comment: comments[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL COMMENTS FOR A SNIPPET
const getComments = async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT cc.*, u.name as user_name
       FROM code_comments cc
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE cc.snippet_id = ?
       ORDER BY cc.line_number ASC, cc.created_at ASC`,
      [req.params.snippetId]
    );
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// RESOLVE A COMMENT
const resolveComment = async (req, res) => {
  try {
    await pool.query(
      `UPDATE code_comments SET status = 'resolved' WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Comment resolved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSnippet,
  getSnippetsByTask,
  addComment,
  getComments,
  resolveComment
};