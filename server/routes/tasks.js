const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const {
  createTask, getTasksByProject, getTaskById, updateTask, deleteTask,
  updateTaskStatus, linkGithub, unlinkGithub, syncBranchStatus, bulkCreateFromGitHub,
} = require('../controllers/taskController');

router.post('/',                   auth, createTask);
router.post('/bulk-github',        auth, bulkCreateFromGitHub);
router.post('/sync-branch',        auth, syncBranchStatus);
router.get('/project/:projectId',  auth, getTasksByProject);
router.get('/:id',                 auth, getTaskById);
router.put('/:id',                 auth, updateTask);
router.delete('/:id',              auth, deleteTask);
router.patch('/:id/status',        auth, updateTaskStatus);
router.patch('/:id/github',        auth, linkGithub);
router.delete('/:id/github',       auth, unlinkGithub);

module.exports = router;