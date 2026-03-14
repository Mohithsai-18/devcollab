const pool = require('../config/db');

// GET PROJECT ANALYTICS
const getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Task counts by status
    const [taskStats] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM tasks WHERE project_id = ?
       GROUP BY status`,
      [projectId]
    );

    // Task counts by priority
    const [priorityStats] = await pool.query(
      `SELECT priority, COUNT(*) as count
       FROM tasks WHERE project_id = ?
       GROUP BY priority`,
      [projectId]
    );

    // Member contributions
    const [memberStats] = await pool.query(
      `SELECT u.name, u.id,
        COUNT(t.id) as assigned_tasks,
        SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as completed_tasks
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.project_id = ?
       WHERE pm.project_id = ?
       GROUP BY u.id`,
      [projectId, projectId]
    );

    // Total story points
    const [pointStats] = await pool.query(
      `SELECT
        SUM(story_points) as total_points,
        SUM(CASE WHEN status='done' THEN story_points ELSE 0 END) as completed_points
       FROM tasks WHERE project_id = ?`,
      [projectId]
    );

    res.json({
      taskStats,
      priorityStats,
      memberStats,
      pointStats: pointStats[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET BURNDOWN DATA FOR A SPRINT
const getBurndownData = async (req, res) => {
  try {
    const { sprintId } = req.params;

    const [sprint] = await pool.query(
      'SELECT * FROM sprints WHERE id = ?', [sprintId]
    );

    if (sprint.length === 0) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    const [tasks] = await pool.query(
      `SELECT story_points, status, deadline
       FROM tasks WHERE sprint_id = ?`,
      [sprintId]
    );

    const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    const completedPoints = tasks
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + (t.story_points || 0), 0);
    const remainingPoints = totalPoints - completedPoints;

    res.json({
      sprint: sprint[0],
      totalPoints,
      completedPoints,
      remainingPoints,
      tasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET VELOCITY DATA ACROSS ALL SPRINTS
const getVelocityData = async (req, res) => {
  try {
    const [sprints] = await pool.query(
      `SELECT name, velocity, capacity_points, status
       FROM sprints
       WHERE project_id = ? AND status = 'completed'
       ORDER BY created_at ASC`,
      [req.params.projectId]
    );

    res.json(sprints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProjectAnalytics,
  getBurndownData,
  getVelocityData
};