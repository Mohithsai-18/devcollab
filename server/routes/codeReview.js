const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  createSnippet,
  getSnippetsByTask,
  addComment,
  getComments,
  resolveComment
} = require('../controllers/codeReviewController');

router.post('/snippets', auth, createSnippet);
router.get('/snippets/task/:taskId', auth, getSnippetsByTask);
router.post('/comments', auth, addComment);
router.get('/comments/:snippetId', auth, getComments);
router.patch('/comments/:id/resolve', auth, resolveComment);

module.exports = router;