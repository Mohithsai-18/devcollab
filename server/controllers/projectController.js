const pool = require('../config/db');

// CREATE PROJECT
const createProject = async (req, res) => {
  try {
    const { name, description, deadline } = req.body;
    const owner_id = req.userId;

    const [result] = await pool.query(
      'INSERT INTO projects (name, description, owner_id, deadline) VALUES (?, ?, ?, ?)',
      [name, description, owner_id, deadline || null]
    );

    // Auto-add creator as admin member
    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, owner_id, 'admin']
    );

    res.status(201).json({
      message: 'Project created successfully',
      projectId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET ALL PROJECTS FOR LOGGED IN USER
const getAllProjects = async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.userId]
    );
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET SINGLE PROJECT
const getProjectById = async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.*, u.name as owner_name
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get members
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, pm.role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?`,
      [req.params.id]
    );

    res.json({ ...projects[0], members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE PROJECT
const updateProject = async (req, res) => {
  try {
    const { name, description, status, deadline } = req.body;
    await pool.query(
      'UPDATE projects SET name=?, description=?, status=?, deadline=? WHERE id=? AND owner_id=?',
      [name, description, status, deadline, req.params.id, req.userId]
    );
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE PROJECT
const deleteProject = async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM projects WHERE id = ? AND owner_id = ?',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ADD MEMBER TO PROJECT
const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Find user by email
    const [users] = await pool.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = users[0].id;

    // Check if already a member
    const [existing] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, userId, role || 'developer']
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember
};