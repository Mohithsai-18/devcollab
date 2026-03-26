const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const {
  webhookHandler, manualSync, getProjectHandoffs, getTaskHandoff, getHandoff,
} = require('../controllers/handoffController');

router.post('/webhook',               webhookHandler);
router.post('/sync',             auth, manualSync);
router.get('/project/:projectId', auth, getProjectHandoffs);
router.get('/task/:taskId',       auth, getTaskHandoff);
router.get('/:id',                auth, getHandoff);

module.exports = router;