const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  createSprint,
  getSprintsByProject,
  updateSprint,
  deleteSprint,
  completeSprint
} = require('../controllers/sprintController');

router.post('/', auth, createSprint);
router.get('/project/:projectId', auth, getSprintsByProject);
router.put('/:id', auth, updateSprint);
router.delete('/:id', auth, deleteSprint);
router.patch('/:id/complete', auth, completeSprint);

module.exports = router;