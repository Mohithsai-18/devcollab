const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const {
  connectRepo, getRepoInfo, getConnectedRepos, switchRepo,
  getCommits, getBranches, getFiles, disconnectRepo,
  getUserRepos, getFileContent, getFolderFiles,
} = require('../controllers/githubController');

router.post('/connect',                   auth, connectRepo);
router.get('/repo/:projectId',            auth, getRepoInfo);
router.get('/repos/connected/:projectId', auth, getConnectedRepos);
router.patch('/switch/:repoId',           auth, switchRepo);
router.get('/commits/:projectId',         auth, getCommits);
router.get('/branches/:projectId',        auth, getBranches);
router.get('/files/:projectId',           auth, getFiles);
router.delete('/disconnect/:projectId',   auth, disconnectRepo);
router.get('/repos',                      auth, getUserRepos);
router.get('/content/:projectId',         auth, getFileContent);
router.get('/folder/:projectId',          auth, getFolderFiles);

module.exports = router;