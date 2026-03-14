const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getProjectAnalytics,
  getBurndownData,
  getVelocityData
} = require('../controllers/analyticsController');

router.get('/project/:projectId', auth, getProjectAnalytics);
router.get('/burndown/:sprintId', auth, getBurndownData);
router.get('/velocity/:projectId', auth, getVelocityData);

module.exports = router;