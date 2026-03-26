const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const {
  ragChat,
  prQualityGate,
  impactAnalyser,
  aiCodeReview,
  aiEstimatePoints,
  aiTaskBreakdown,
  indexProject,
  getIndexStatus,
} = require('../controllers/aiController');

router.post('/chat',        auth, ragChat);
router.post('/pr-review',   auth, prQualityGate);
router.post('/impact',      auth, impactAnalyser);
router.post('/code-review', auth, aiCodeReview);
router.post('/estimate',    auth, aiEstimatePoints);
router.post('/breakdown',   auth, aiTaskBreakdown);

// RAG indexing endpoints
router.post('/index',                    auth, indexProject);
router.get('/index-status/:project_id',  auth, getIndexStatus);

module.exports = router;