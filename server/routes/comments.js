const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const commentController = require('../controllers/commentController');

router.get('/:taskId', auth, commentController.getComments);
router.post('/', auth, commentController.addComment);
router.delete('/:id', auth, commentController.deleteComment);

module.exports = router;