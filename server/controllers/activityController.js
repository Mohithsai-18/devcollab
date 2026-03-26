const pool = require('../config/db');

// Helper to log an activity
const logActivity = async (project_id, user_id, action, details = null) => {
  try {
    if (!project_id || !user_id || !action) return;
    await pool.query(
      'INSERT INTO activities (project_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [project_id, user_id, action, details]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Get activities for a project
const getProjectActivities = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate access
    const [members] = await pool.query(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, req.userId]
    );

    if (members.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [activities] = await pool.query(`
      SELECT a.*, u.name as user_name 
      FROM activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [projectId]);

    res.json(activities);
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get activities across all user's projects for the Dashboard
const getUserActivities = async (req, res) => {
  try {
    const [activities] = await pool.query(`
      SELECT a.*, p.name as project_name, u.name as user_name 
      FROM activities a
      JOIN projects p ON a.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON a.user_id = u.id
      WHERE pm.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [req.userId]);

    res.json(activities);
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { logActivity, getProjectActivities, getUserActivities };
