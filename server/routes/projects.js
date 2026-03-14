const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember
} = require('../controllers/projectController');

router.post('/', auth, createProject);
router.get('/', auth, getAllProjects);
router.get('/:id', auth, getProjectById);
router.put('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);
router.post('/:id/members', auth, addMember);

module.exports = router;