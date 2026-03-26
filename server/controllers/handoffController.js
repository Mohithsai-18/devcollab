const pool    = require('../config/db');
const { Octokit } = require('@octokit/rest');
const https   = require('https');

const callGroq = (prompt) => new Promise((resolve, reject) => {
  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
    temperature: 0.3,
  });

  const req = https.request({
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        resolve(json.choices?.[0]?.message?.content || '');
      } catch { reject(new Error('Groq parse error')); }
    });
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

const fetchDiff = async (owner, repo, sha, token) => {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
  try {
    const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });
    const files = data.files || [];
    let diff = files.map(f =>
      `FILE: ${f.filename} [${f.status}] +${f.additions} -${f.deletions}\n${(f.patch || '').substring(0, 400)}`
    ).join('\n---\n');
    return {
      diff: diff.substring(0, 3000),
      files: files.map(f => ({ name: f.filename, status: f.status, additions: f.additions, deletions: f.deletions })),
    };
  } catch { return { diff: '', files: [] }; }
};

const generateBrief = async ({ commitMsg, author, branch, diff, taskTitle }) => {
  const prompt = `You are a senior developer writing a handoff brief for the next developer on this team.

COMMIT INFO:
- Message: ${commitMsg}
- Author: ${author}
- Branch: ${branch}
- Task: ${taskTitle || 'Unknown'}

CODE DIFF:
${diff || 'No diff available'}

Write a concise handoff brief in exactly this JSON format (no markdown, no extra text, valid JSON only):
{
  "what_changed": "2-3 sentences describing what was actually implemented or changed in this commit.",
  "what_pending": "2-3 sentences describing what is likely still incomplete or what needs to be done next based on the code.",
  "who_did_what": "1-2 sentences summarising who made this change, when, and on which branch.",
  "brief": "3-4 sentence continuation brief written directly TO the next developer, telling them exactly where to pick up and what to watch out for."
}`;

  try {
    const raw   = await callGroq(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      what_changed: `${author} pushed "${commitMsg}" to ${branch}.`,
      what_pending: 'Review the latest commit and check open tasks for pending work.',
      who_did_what: `${author} committed to branch ${branch}.`,
      brief: `Pick up from the latest commit by ${author} on ${branch}. Review the diff and check open tasks before continuing.`,
    };
  }
};

const matchTask = async (projectId, branch, commitMsg) => {
  const branchMatch = branch.match(/task[/-](\d+)/i);
  if (branchMatch) {
    const [tasks] = await pool.query(
      'SELECT id, title FROM tasks WHERE project_id = ? AND id = ?',
      [projectId, parseInt(branchMatch[1])]
    );
    if (tasks.length) return tasks[0];
  }
  const msgMatch = commitMsg.match(/#(\d+)/);
  if (msgMatch) {
    const [tasks] = await pool.query(
      'SELECT id, title FROM tasks WHERE project_id = ? AND id = ?',
      [projectId, parseInt(msgMatch[1])]
    );
    if (tasks.length) return tasks[0];
  }
  return null;
};

const processCommit = async ({ project_id, commit, branch, owner, repoName, github_token }) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM handoffs WHERE commit_sha = ?', [commit.id]
    );
    if (existing.length) return;

    const { diff, files } = await fetchDiff(owner, repoName, commit.id, github_token);
    const task = await matchTask(project_id, branch, commit.message);
    const sections = await generateBrief({
      commitMsg:  commit.message.split('\n')[0],
      author:     commit.author?.name || commit.committer?.name || 'Unknown',
      branch,
      diff,
      taskTitle:  task?.title || null,
    });

    await pool.query(
      `INSERT INTO handoffs
         (project_id, task_id, commit_sha, commit_msg, author, branch,
          files_changed, what_changed, what_pending, who_did_what, brief, diff_snippet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id, task?.id || null,
        commit.id.substring(0, 40),
        commit.message.split('\n')[0].substring(0, 499),
        commit.author?.name || 'Unknown',
        branch,
        JSON.stringify(files),
        sections.what_changed, sections.what_pending,
        sections.who_did_what, sections.brief,
        diff.substring(0, 3000),
      ]
    );

    if (task) {
      await pool.query(
        'UPDATE tasks SET github_branch=?, github_commit_sha=?, github_commit_msg=? WHERE id=?',
        [branch, commit.id.substring(0, 7), commit.message.split('\n')[0].substring(0, 499), task.id]
      );
    }

    console.log(`✅ Handoff created for commit ${commit.id.substring(0, 7)} on project ${project_id}`);
  } catch (err) {
    console.error('processCommit error:', err);
  }
};

const webhookHandler = async (req, res) => {
  res.json({ message: 'Webhook received' });
  try {
    const event = req.headers['x-github-event'];
    if (event !== 'push') return;

    const { commits, repository, ref } = req.body;
    if (!commits?.length) return;

    const branch   = ref?.replace('refs/heads/', '') || 'unknown';
    const repoName = repository?.name;
    const owner    = repository?.owner?.login;

    const [githubRows] = await pool.query(
      'SELECT * FROM project_github WHERE repo_owner = ? AND repo_name = ?',
      [owner, repoName]
    );
    if (!githubRows.length) return;

    const { project_id, github_token } = githubRows[0];

    for (const commit of commits.slice(0, 3)) {
      await processCommit({ project_id, commit, branch, owner, repoName, github_token });
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
};

const manualSync = async (req, res) => {
  try {
    const { project_id, commit_sha, branch, task_id } = req.body;

    if (!project_id || !commit_sha) {
      return res.status(400).json({ message: 'project_id and commit_sha required' });
    }

    const [githubRows] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ?', [project_id]
    );
    if (!githubRows.length) {
      return res.status(404).json({ message: 'No GitHub repo connected to this project' });
    }
    const { repo_owner, repo_name, github_token } = githubRows[0];

    const octokit = new Octokit({ auth: github_token || process.env.GITHUB_TOKEN });
    const { data: commitData } = await octokit.repos.getCommit({
      owner: repo_owner, repo: repo_name, ref: commit_sha
    });

    const commit = {
      id:      commitData.sha,
      message: commitData.commit.message,
      author:  { name: commitData.commit.author.name },
    };

    const useBranch = branch || 'main';

    let task = null;
    if (task_id) {
      const [tasks] = await pool.query('SELECT id, title FROM tasks WHERE id = ?', [task_id]);
      task = tasks[0] || null;
    } else {
      task = await matchTask(project_id, useBranch, commit.message);
    }

    const [existing] = await pool.query(
      'SELECT * FROM handoffs WHERE commit_sha = ?', [commit.id.substring(0, 40)]
    );

    const { diff, files } = await fetchDiff(repo_owner, repo_name, commit.id, github_token);
    const sections = await generateBrief({
      commitMsg:  commit.message.split('\n')[0],
      author:     commit.author?.name || 'Unknown',
      branch:     useBranch,
      diff,
      taskTitle:  task?.title || null,
    });

    if (existing.length) {
      await pool.query(
        `UPDATE handoffs SET
           what_changed=?, what_pending=?, who_did_what=?, brief=?,
           files_changed=?, diff_snippet=?, task_id=?
         WHERE id=?`,
        [
          sections.what_changed, sections.what_pending,
          sections.who_did_what, sections.brief,
          JSON.stringify(files), diff.substring(0, 3000),
          task?.id || null, existing[0].id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO handoffs
           (project_id, task_id, commit_sha, commit_msg, author, branch,
            files_changed, what_changed, what_pending, who_did_what, brief, diff_snippet)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project_id, task?.id || null,
          commit.id.substring(0, 40),
          commit.message.split('\n')[0].substring(0, 499),
          commit.author?.name || 'Unknown',
          useBranch,
          JSON.stringify(files),
          sections.what_changed, sections.what_pending,
          sections.who_did_what, sections.brief,
          diff.substring(0, 3000),
        ]
      );
    }

    if (task) {
      await pool.query(
        'UPDATE tasks SET github_branch=?, github_commit_sha=?, github_commit_msg=? WHERE id=?',
        [useBranch, commit.id.substring(0, 7), commit.message.split('\n')[0].substring(0, 499), task.id]
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM handoffs WHERE commit_sha = ? ORDER BY created_at DESC LIMIT 1',
      [commit.id.substring(0, 40)]
    );

    res.json({ message: 'Handoff generated', handoff: rows[0] });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ message: 'Failed to generate handoff brief' });
  }
};

const getProjectHandoffs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT h.*, t.title as task_title, t.status as task_status
       FROM handoffs h
       LEFT JOIN tasks t ON h.task_id = t.id
       WHERE h.project_id = ?
       ORDER BY h.created_at DESC
       LIMIT 50`,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTaskHandoff = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM handoffs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.taskId]
    );
    if (!rows.length) return res.status(404).json({ message: 'No handoff found for this task' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getHandoff = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT h.*, t.title as task_title, t.status as task_status
       FROM handoffs h LEFT JOIN tasks t ON h.task_id = t.id
       WHERE h.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Handoff not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  webhookHandler, manualSync, getProjectHandoffs, getTaskHandoff, getHandoff,
};