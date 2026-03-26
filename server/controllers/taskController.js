const pool = require('../config/db');
const { sendTaskAssignedEmail } = require('../utils/emailService');
const { logActivity } = require('./activityController');

const createTask = async (req, res) => {
  try {
    const { project_id, sprint_id, title, description, assigned_to, priority, story_points, deadline } = req.body;
    const [result] = await pool.query(
      `INSERT INTO tasks (project_id, sprint_id, title, description, assigned_to, created_by, priority, story_points, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id, sprint_id || null, title, description, assigned_to || null,
       req.userId, priority || 'p3', story_points || 0, deadline || null]
    );
    await logActivity(project_id, req.userId, 'created task', title);
    res.status(201).json({ message: 'Task created successfully', taskId: result.insertId });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const getTasksByProject = async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name, s.name as sprint_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       LEFT JOIN sprints s ON t.sprint_id = s.id
       WHERE t.project_id = ? ORDER BY t.created_at DESC`,
      [req.params.projectId]
    );
    res.json(tasks);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const getTaskById = async (req, res) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, u1.name as assigned_to_name, u2.name as created_by_name
       FROM tasks t
       LEFT JOIN users u1 ON t.assigned_to = u1.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!tasks.length) return res.status(404).json({ message: 'Task not found' });
    res.json(tasks[0]);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const updateTask = async (req, res) => {
  try {
    const { title, description, assigned_to, priority, status, story_points, deadline, sprint_id } = req.body;
    await pool.query(
      `UPDATE tasks SET title=?, description=?, assigned_to=?, priority=?, status=?,
       story_points=?, deadline=?, sprint_id=? WHERE id=?`,
      [title, description, assigned_to || null, priority, status,
       story_points, deadline || null, sprint_id || null, req.params.id]
    );
    if (assigned_to) {
      const [assignedUser] = await pool.query('SELECT name, email FROM users WHERE id = ?', [assigned_to]);
      const [taskInfo] = await pool.query(
        `SELECT t.title, p.name as project_name, u.name as assigner_name
         FROM tasks t JOIN projects p ON t.project_id = p.id
         LEFT JOIN users u ON t.created_by = u.id WHERE t.id = ?`, [req.params.id]
      );
      if (assignedUser.length && taskInfo.length) {
        sendTaskAssignedEmail(assignedUser[0].email, assignedUser[0].name,
          taskInfo[0].title, taskInfo[0].project_name, taskInfo[0].assigner_name || 'A team member');
      }
    }
    const [task] = await pool.query('SELECT project_id FROM tasks WHERE id=?', [req.params.id]);
    if (task.length) await logActivity(task[0].project_id, req.userId, 'updated task', title);
    res.json({ message: 'Task updated successfully' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const deleteTask = async (req, res) => {
  try {
    const [task] = await pool.query('SELECT project_id, title FROM tasks WHERE id=?', [req.params.id]);
    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (task.length) await logActivity(task[0].project_id, req.userId, 'deleted task', task[0].title);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const updateTaskStatus = async (req, res) => {
  try {
    const [task] = await pool.query('SELECT project_id, title FROM tasks WHERE id=?', [req.params.id]);
    await pool.query('UPDATE tasks SET status=? WHERE id=?', [req.body.status, req.params.id]);
    if (task.length) await logActivity(task[0].project_id, req.userId, `moved task to ${req.body.status.replace('_', ' ')}`, task[0].title);
    res.json({ message: 'Task status updated', status: req.body.status });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const linkGithub = async (req, res) => {
  try {
    const { github_branch, github_commit_sha, github_commit_msg, github_pr_url } = req.body;
    await pool.query(
      `UPDATE tasks SET github_branch=?, github_commit_sha=?, github_commit_msg=?, github_pr_url=? WHERE id=?`,
      [github_branch || null, github_commit_sha || null, github_commit_msg || null, github_pr_url || null, req.params.id]
    );
    res.json({ message: 'GitHub link updated' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const unlinkGithub = async (req, res) => {
  try {
    await pool.query(
      `UPDATE tasks SET github_branch=NULL, github_commit_sha=NULL, github_commit_msg=NULL, github_pr_url=NULL WHERE id=?`,
      [req.params.id]
    );
    res.json({ message: 'GitHub unlinked' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const syncBranchStatus = async (req, res) => {
  try {
    const { branch, action } = req.body;
    const match = branch.match(/task[/-](\d+)/i);
    if (!match) return res.json({ message: 'No task ID found in branch name', branch });
    const statusMap = { opened: 'in_progress', synchronize: 'in_progress', merged: 'done', closed: 'in_review' };
    const newStatus = statusMap[action];
    if (!newStatus) return res.json({ message: 'No status mapping', action });
    const [result] = await pool.query('UPDATE tasks SET status=?, github_branch=? WHERE id=?',
      [newStatus, branch, parseInt(match[1])]);
    if (!result.affectedRows) return res.status(404).json({ message: `Task ${match[1]} not found` });
    res.json({ message: `Task ${match[1]} → ${newStatus}`, taskId: parseInt(match[1]), newStatus });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

const bulkCreateFromGitHub = async (req, res) => {
  try {
    const { project_id, files, status = 'backlog', sprint_id } = req.body;
    if (!project_id || !Array.isArray(files) || !files.length) {
      return res.status(400).json({ message: 'project_id and files[] are required' });
    }
    const created = [];
    for (const file of files) {
      const [result] = await pool.query(
        `INSERT INTO tasks
           (project_id, sprint_id, title, description, assigned_to, created_by,
            priority, status, story_points, github_pr_url)
         VALUES (?, ?, ?, ?, ?, ?, 'p3', ?, 0, ?)`,
        [project_id, sprint_id || null, file.name, `GitHub: ${file.path}`,
         req.userId, req.userId, status, file.url || null]
      );
      created.push({ taskId: result.insertId, title: file.name, path: file.path });
    }
    res.status(201).json({ message: `${created.length} tasks created from GitHub`, created });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error during bulk create' }); }
};

module.exports = {
  createTask, getTasksByProject, getTaskById, updateTask, deleteTask,
  updateTaskStatus, linkGithub, unlinkGithub, syncBranchStatus, bulkCreateFromGitHub,
};