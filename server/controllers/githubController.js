const pool = require('../config/db');
const { Octokit } = require('@octokit/rest');

const getOctokit = (token) => new Octokit({ auth: token || process.env.GITHUB_TOKEN });

// ── CONNECT REPO (allows multiple per project) ────────────────────────────────
const connectRepo = async (req, res) => {
  try {
    const { project_id, repo_owner, repo_name, github_token, nickname } = req.body;
    const octokit = getOctokit(github_token);
    try { await octokit.repos.get({ owner: repo_owner, repo: repo_name }); }
    catch { return res.status(404).json({ message: 'Repository not found or no access' }); }

    // Check if this repo is already connected
    const [existing] = await pool.query(
      'SELECT id FROM project_github WHERE project_id = ? AND repo_owner = ? AND repo_name = ?',
      [project_id, repo_owner, repo_name]
    );
    if (existing.length) {
      return res.status(400).json({ message: 'This repository is already connected to this project' });
    }

    // Deactivate all others first, make this one active
    await pool.query('UPDATE project_github SET is_active = 0 WHERE project_id = ?', [project_id]);

    await pool.query(
      `INSERT INTO project_github (project_id, repo_owner, repo_name, github_token, is_active, nickname)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [project_id, repo_owner, repo_name, github_token || null, nickname || `${repo_owner}/${repo_name}`]
    );

    res.json({ message: 'Repository connected successfully' });
  } catch (error) { 
    console.error('--- GITHUB CONNECT ERROR ---', error); 
    res.status(500).json({ message: error.message || 'Server error' }); 
  }
};

// ── GET ACTIVE REPO INFO ──────────────────────────────────────────────────────
const getRepoInfo = async (req, res) => {
  try {
    const [github] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ? AND is_active = 1 LIMIT 1',
      [req.params.projectId]
    );
    if (!github.length) {
      // fallback: get any connected repo
      const [any] = await pool.query(
        'SELECT * FROM project_github WHERE project_id = ? LIMIT 1',
        [req.params.projectId]
      );
      if (!any.length) return res.status(404).json({ message: 'No repository connected' });
      await pool.query('UPDATE project_github SET is_active = 1 WHERE id = ?', [any[0].id]);
      github[0] = any[0];
    }
    const { repo_owner, repo_name, github_token } = github[0];
    const { data } = await getOctokit(github_token).repos.get({ owner: repo_owner, repo: repo_name });
    res.json({
      name: data.name, full_name: data.full_name, description: data.description,
      html_url: data.html_url, stars: data.stargazers_count, forks: data.forks_count,
      open_issues: data.open_issues_count, default_branch: data.default_branch,
      language: data.language, updated_at: data.updated_at, visibility: data.visibility
    });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── GET ALL CONNECTED REPOS FOR A PROJECT ─────────────────────────────────────
const getConnectedRepos = async (req, res) => {
  try {
    const [repos] = await pool.query(
      'SELECT id, repo_owner, repo_name, is_active, nickname, connected_at FROM project_github WHERE project_id = ? ORDER BY connected_at DESC',
      [req.params.projectId]
    );
    res.json(repos);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── SWITCH ACTIVE REPO ────────────────────────────────────────────────────────
const switchRepo = async (req, res) => {
  try {
    const { project_id } = req.body;
    const { repoId } = req.params;

    // Verify this repo belongs to this project
    const [repo] = await pool.query(
      'SELECT * FROM project_github WHERE id = ? AND project_id = ?',
      [repoId, project_id]
    );
    if (!repo.length) return res.status(404).json({ message: 'Repository not found' });

    // Deactivate all, activate selected
    await pool.query('UPDATE project_github SET is_active = 0 WHERE project_id = ?', [project_id]);
    await pool.query('UPDATE project_github SET is_active = 1 WHERE id = ?', [repoId]);

    res.json({ message: `Switched to ${repo[0].repo_owner}/${repo[0].repo_name}` });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── GET COMMITS ───────────────────────────────────────────────────────────────
const getCommits = async (req, res) => {
  try {
    const [github] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ? AND is_active = 1 LIMIT 1',
      [req.params.projectId]
    );
    if (!github.length) return res.status(404).json({ message: 'No repository connected' });
    const { repo_owner, repo_name, github_token } = github[0];
    const { data } = await getOctokit(github_token).repos.listCommits({
      owner: repo_owner, repo: repo_name,
      sha: req.query.branch || undefined, per_page: 20
    });
    res.json(data.map(c => ({
      sha: c.sha.substring(0, 7), message: c.commit.message.split('\n')[0],
      author: c.commit.author.name, date: c.commit.author.date, url: c.html_url
    })));
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── GET BRANCHES ──────────────────────────────────────────────────────────────
const getBranches = async (req, res) => {
  try {
    const [github] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ? AND is_active = 1 LIMIT 1',
      [req.params.projectId]
    );
    if (!github.length) return res.status(404).json({ message: 'No repository connected' });
    const { repo_owner, repo_name, github_token } = github[0];
    const { data } = await getOctokit(github_token).repos.listBranches({ owner: repo_owner, repo: repo_name });
    res.json(data.map(b => ({ name: b.name, sha: b.commit.sha.substring(0, 7) })));
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── GET FILES ─────────────────────────────────────────────────────────────────
const getFiles = async (req, res) => {
  try {
    const [github] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ? AND is_active = 1 LIMIT 1',
      [req.params.projectId]
    );
    if (!github.length) return res.status(404).json({ message: 'No repository connected' });
    const { repo_owner, repo_name, github_token } = github[0];
    const { data } = await getOctokit(github_token).repos.getContent({
      owner: repo_owner, repo: repo_name, path: req.query.path || ''
    });
    res.json(Array.isArray(data) ? data.map(f => ({ name: f.name, path: f.path, type: f.type, size: f.size, url: f.html_url })) : []);
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── DISCONNECT ONE REPO ───────────────────────────────────────────────────────
const disconnectRepo = async (req, res) => {
  try {
    const [repo] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ?',
      [req.params.projectId]
    );

    await pool.query('DELETE FROM project_github WHERE project_id = ? AND is_active = 1', [req.params.projectId]);

    // Auto-activate the next one if exists
    const [remaining] = await pool.query(
      'SELECT id FROM project_github WHERE project_id = ? LIMIT 1',
      [req.params.projectId]
    );
    if (remaining.length) {
      await pool.query('UPDATE project_github SET is_active = 1 WHERE id = ?', [remaining[0].id]);
    }

    res.json({ message: 'Repository disconnected' });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── GET ALL USER REPOS ────────────────────────────────────────────────────────
const getUserRepos = async (req, res) => {
  try {
    const githubToken = req.headers['x-github-token'];
    if (!githubToken) return res.status(400).json({ message: 'GitHub token required' });
    const { data } = await getOctokit(githubToken).repos.listForAuthenticatedUser({
      sort: 'updated', per_page: 100, affiliation: 'owner,collaborator,organization_member'
    });
    res.json(data.map(r => ({
      name: r.name, full_name: r.full_name, owner: r.owner.login,
      description: r.description, private: r.private, language: r.language,
      stars: r.stargazers_count, updated_at: r.updated_at,
      default_branch: r.default_branch, fork: r.fork
    })));
  } catch (error) {
    console.error(error);
    if (error.status === 401) return res.status(401).json({ message: 'Invalid GitHub token' });
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
};

// ── GET FILE CONTENT ──────────────────────────────────────────────────────────
const getFileContent = async (req, res) => {
  try {
    const [github] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ? AND is_active = 1 LIMIT 1',
      [req.params.projectId]
    );
    if (!github.length) return res.status(404).json({ message: 'No repository connected' });
    const { repo_owner, repo_name, github_token } = github[0];
    const { data } = await getOctokit(github_token).repos.getContent({
      owner: repo_owner, repo: repo_name, path: req.query.path
    });
    const content = data.encoding === 'base64'
      ? Buffer.from(data.content, 'base64').toString('utf8')
      : data.content;
    res.json({ content, path: data.path, size: data.size });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Server error' }); }
};

// ── GET FOLDER FILES ──────────────────────────────────────────────────────────
const getFolderFiles = async (req, res) => {
  try {
    const [github] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ? AND is_active = 1 LIMIT 1',
      [req.params.projectId]
    );
    if (!github.length) return res.status(404).json({ message: 'No repository connected' });
    const { repo_owner, repo_name, github_token } = github[0];
    const octokit = getOctokit(github_token);
    const folderPath = req.query.path || '';
    const recursive  = req.query.recursive === 'true';

    const fetchLevel = async (path) => {
      const { data } = await octokit.repos.getContent({ owner: repo_owner, repo: repo_name, path });
      if (!Array.isArray(data)) return [];
      let results = [];
      for (const item of data) {
        if (item.type === 'file') {
          results.push({ name: item.name, path: item.path, size: item.size, url: item.html_url, type: 'file' });
        } else if (item.type === 'dir') {
          if (recursive) {
            const sub = await fetchLevel(item.path);
            results = results.concat(sub);
          } else {
            results.push({ name: item.name, path: item.path, size: 0, url: item.html_url, type: 'dir' });
          }
        }
      }
      return results;
    };

    const files = await fetchLevel(folderPath);
    res.json({ path: folderPath, files });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Failed to fetch folder contents' }); }
};

module.exports = {
  connectRepo, getRepoInfo, getConnectedRepos, switchRepo,
  getCommits, getBranches, getFiles, disconnectRepo,
  getUserRepos, getFileContent, getFolderFiles,
};