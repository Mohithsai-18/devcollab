const pool = require('../config/db');

// CREATE SPRINT
const createSprint = async (req, res) => {
  try {
    const { project_id, name, start_date, end_date, capacity_points } = req.body;

    const [result] = await pool.query(
      `INSERT INTO sprints (project_id, name, start_date, end_date, capacity_points)
       VALUES (?, ?, ?, ?, ?)`,
      [project_id, name, start_date || null, end_date || null, capacity_points || 0]
    );

    res.status(201).json({
      message: 'Sprint created successfully',
      sprintId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL SPRINTS FOR A PROJECT
const getSprintsByProject = async (req, res) => {
  try {
    const [sprints] = await pool.query(
      `SELECT s.*,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(t.story_points) as total_points,
        SUM(CASE WHEN t.status = 'done' THEN t.story_points ELSE 0 END) as completed_points
       FROM sprints s
       LEFT JOIN tasks t ON s.id = t.sprint_id
       WHERE s.project_id = ?
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.params.projectId]
    );
    res.json(sprints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE SPRINT
const updateSprint = async (req, res) => {
  try {
    const { name, start_date, end_date, capacity_points, status } = req.body;

    await pool.query(
      `UPDATE sprints SET
        name=?, start_date=?, end_date=?,
        capacity_points=?, status=?
       WHERE id=?`,
      [name, start_date || null, end_date || null,
       capacity_points || 0, status, req.params.id]
    );

    res.json({ message: 'Sprint updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE SPRINT
const deleteSprint = async (req, res) => {
  try {
    await pool.query('DELETE FROM sprints WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sprint deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// COMPLETE SPRINT — calculates velocity
const completeSprint = async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT SUM(story_points) as velocity
       FROM tasks
       WHERE sprint_id = ? AND status = 'done'`,
      [req.params.id]
    );

    const velocity = tasks[0].velocity || 0;

    await pool.query(
      `UPDATE sprints SET status='completed', velocity=? WHERE id=?`,
      [velocity, req.params.id]
    );

    res.json({
      message: 'Sprint completed',
      velocity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSprint,
  getSprintsByProject,
  updateSprint,
  deleteSprint,
  completeSprint
};