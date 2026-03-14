const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus
} = require('../controllers/taskController');

router.post('/', auth, createTask);
router.get('/project/:projectId', auth, getTasksByProject);
router.get('/:id', auth, getTaskById);
router.put('/:id', auth, updateTask);
router.delete('/:id', auth, deleteTask);
router.patch('/:id/status', auth, updateTaskStatus);

module.exports = router;