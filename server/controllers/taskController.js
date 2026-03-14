const pool = require('../config/db');

// CREATE TASK
const createTask = async (req, res) => {
  try {
    const {
      project_id, sprint_id, title, description,
      assigned_to, priority, story_points, deadline
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO tasks 
       (project_id, sprint_id, title, description, assigned_to, created_by, priority, story_points, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id, sprint_id || null, title, description,
       assigned_to || null, req.userId, priority || 'p3',
       story_points || 0, deadline || null]
    );

    res.status(201).json({
      message: 'Task created successfully',
      taskId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL TASKS FOR A PROJECT
const getTasksByProject = async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, 
        u1.name as assigned_to_name,
        u2.name as created_by_name,
        s.name as sprint_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       LEFT JOIN sprints s ON t.sprint_id = s.id
       WHERE t.project_id = ?
       ORDER BY t.created_at DESC`,
      [req.params.projectId]
    );
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SINGLE TASK
const getTaskById = async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*,
        u1.name as assigned_to_name,
        u2.name as created_by_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(tasks[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE TASK
const updateTask = async (req, res) => {
  try {
    const {
      title, description, assigned_to,
      priority, status, story_points, deadline, sprint_id
    } = req.body;

    await pool.query(
      `UPDATE tasks SET
        title=?, description=?, assigned_to=?,
        priority=?, status=?, story_points=?,
        deadline=?, sprint_id=?
       WHERE id=?`,
      [title, description, assigned_to || null,
       priority, status, story_points,
       deadline || null, sprint_id || null,
       req.params.id]
    );

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE TASK
const deleteTask = async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE TASK STATUS ONLY (for Kanban drag and drop)
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    await pool.query(
      'UPDATE tasks SET status=? WHERE id=?',
      [status, req.params.id]
    );

    res.json({ message: 'Task status updated', status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus
};