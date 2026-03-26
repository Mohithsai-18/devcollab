const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getProjectActivities, getUserActivities } = require('../controllers/activityController');

// GET /api/activities/project/:projectId
router.get('/project/:projectId', auth, getProjectActivities);

// GET /api/activities/ (all user projects)
router.get('/', auth, getUserActivities);

module.exports = router;
