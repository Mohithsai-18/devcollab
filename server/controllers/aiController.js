
const pool = require('../config/db');
const { Octokit } = require('@octokit/rest');
const https = require('https');
const vectorStore = require('../services/vectorStoreService');
const ragIndexing = require('../services/ragIndexingService');

// ── Groq call ─────────────────────────────────────────────────────────────────
const callGroq = (prompt, stream = false) => new Promise((resolve, reject) => {
  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.3,
    stream: false,
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

// ── Fetch file content from GitHub ───────────────────────────────────────────
const fetchFileContent = async (owner, repo, path, token) => {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf8').substring(0, 2000);
    }
    return (data.content || '').substring(0, 2000);
  } catch { return ''; }
};

// ── Fetch repo file tree ──────────────────────────────────────────────────────
const fetchFileTree = async (owner, repo, token) => {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
  try {
    const { data } = await octokit.git.getTree({
      owner, repo, tree_sha: 'HEAD', recursive: '1',
    });
    return data.tree
      .filter(f => f.type === 'blob')
      .map(f => f.path)
      .filter(p => !p.includes('node_modules') && !p.includes('.git'))
      .slice(0, 100);
  } catch { return []; }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. RAG CHAT (UPGRADED — Semantic Vector Search)
// POST /api/ai/chat
// Body: { project_id, question, file_path? }
// ─────────────────────────────────────────────────────────────────────────────
const ragChat = async (req, res) => {
  try {
    const { project_id, question, file_path } = req.body;
    if (!project_id || !question) {
      return res.status(400).json({ message: 'project_id and question required' });
    }

    // Get project info
    const [projects] = await pool.query(
      'SELECT name, description, status FROM projects WHERE id = ?', [project_id]
    );

    // Check if project has been indexed
    const indexStatus = await ragIndexing.getIndexStatus(project_id);

    let ragContext = '';
    let sources = [];

    if (indexStatus.status === 'ready') {
      // ── SEMANTIC SEARCH via ChromaDB ──────────────────────────────────
      const searchQuery = file_path ? `${question} file:${file_path}` : question;
      const results = await vectorStore.search(project_id, searchQuery, 8);

      if (results.length > 0) {
        sources = results.map((r, i) => ({
          rank: i + 1,
          type: r.metadata?.type || 'unknown',
          source: r.metadata?.file_path || r.metadata?.task_id || r.metadata?.handoff_id || 'N/A',
          relevance: (1 - (r.distance || 0)).toFixed(3),
          preview: r.content?.substring(0, 100) + '...',
        }));

        ragContext = results.map((r, i) =>
          `[SOURCE ${i + 1} — ${r.metadata?.type || 'unknown'}: ${r.metadata?.file_path || r.metadata?.task_id || 'N/A'}]\n${r.content}`
        ).join('\n\n---\n\n');
      }
    }

    // ── Fallback: if no RAG index, use the old keyword approach ─────────
    if (!ragContext) {
      const [githubRows] = await pool.query(
        'SELECT * FROM project_github WHERE project_id = ?', [project_id]
      );

      const [tasks] = await pool.query(
        `SELECT title, status, description, github_branch FROM tasks
         WHERE project_id = ? ORDER BY created_at DESC LIMIT 20`,
        [project_id]
      );

      const [handoffs] = await pool.query(
        `SELECT commit_msg, author, branch, brief, what_changed, what_pending
         FROM handoffs WHERE project_id = ? ORDER BY created_at DESC LIMIT 5`,
        [project_id]
      );

      let codeContext = '';
      let fileTree = [];

      if (githubRows.length) {
        const { repo_owner, repo_name, github_token } = githubRows[0];
        fileTree = await fetchFileTree(repo_owner, repo_name, github_token);

        if (file_path) {
          const content = await fetchFileContent(repo_owner, repo_name, file_path, github_token);
          codeContext = `\nFILE: ${file_path}\n\`\`\`\n${content}\n\`\`\``;
        } else {
          const keywords = question.toLowerCase().split(' ').filter(w => w.length > 3);
          const relevantFiles = fileTree.filter(f =>
            keywords.some(k => f.toLowerCase().includes(k))
          ).slice(0, 3);

          for (const file of relevantFiles) {
            const content = await fetchFileContent(repo_owner, repo_name, file, github_token);
            if (content) {
              codeContext += `\nFILE: ${file}\n\`\`\`\n${content.substring(0, 800)}\n\`\`\`\n`;
            }
          }
        }
      }

      ragContext = `TASKS (${tasks.length}):
${tasks.map(t => `- [${t.status}] ${t.title}${t.github_branch ? ` (branch: ${t.github_branch})` : ''}`).join('\n')}

RECENT HANDOFFS:
${handoffs.map(h => `- ${h.author} on ${h.branch}: ${h.commit_msg}\n  Brief: ${h.brief || 'N/A'}`).join('\n')}

FILES: ${fileTree.slice(0, 50).join('\n')}

${codeContext ? `CODE:\n${codeContext}` : ''}`;

      sources = [{ rank: 1, type: 'fallback', source: 'keyword-matching', relevance: 'N/A' }];
    }

    // ── Build prompt ────────────────────────────────────────────────────────
    const prompt = `You are an expert developer assistant for the project "${projects[0]?.name || 'Unknown'}".
You have been given relevant context from the project's codebase, tasks, handoffs, and code snippets retrieved via semantic search.

PROJECT: ${projects[0]?.name} — ${projects[0]?.description || 'No description'}

RETRIEVED CONTEXT:
${ragContext}

DEVELOPER QUESTION: ${question}

Instructions:
- Answer concisely and accurately based on the retrieved context
- If referencing code, quote specific lines and mention the file path
- If referencing tasks, mention their status
- If the context doesn't contain enough info to answer, say so honestly
- Format your response with markdown for readability`;

    const answer = await callGroq(prompt);
    res.json({
      answer,
      sources,
      rag_mode: indexStatus.status === 'ready' ? 'semantic' : 'fallback',
      docs_indexed: indexStatus.docs_indexed || 0,
    });
  } catch (error) {
    console.error('RAG chat error:', error);
    res.status(500).json({ message: 'AI chat failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INDEX PROJECT (NEW)
// POST /api/ai/index
// Body: { project_id }
// ─────────────────────────────────────────────────────────────────────────────
const indexProject = async (req, res) => {
  try {
    const { project_id } = req.body;
    if (!project_id) {
      return res.status(400).json({ message: 'project_id required' });
    }

    // Start indexing in background (don't await)
    ragIndexing.indexProject(project_id).catch(err => {
      console.error('Background indexing error:', err);
    });

    res.json({ message: 'Indexing started', status: 'indexing' });
  } catch (error) {
    console.error('Index project error:', error);
    res.status(500).json({ message: 'Failed to start indexing' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INDEX STATUS (NEW)
// GET /api/ai/index-status/:project_id
// ─────────────────────────────────────────────────────────────────────────────
const getIndexStatus = async (req, res) => {
  try {
    const { project_id } = req.params;
    const status = await ragIndexing.getIndexStatus(project_id);
    res.json(status);
  } catch (error) {
    console.error('Index status error:', error);
    res.status(500).json({ message: 'Failed to get index status' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PR QUALITY GATE
// POST /api/ai/pr-review
// Body: { project_id, pr_url }
// ─────────────────────────────────────────────────────────────────────────────
const prQualityGate = async (req, res) => {
  try {
    const { project_id, pr_url } = req.body;
    if (!project_id || !pr_url) {
      return res.status(400).json({ message: 'project_id and pr_url required' });
    }

    // Parse PR URL: https://github.com/owner/repo/pull/123
    const match = pr_url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid GitHub PR URL' });
    }
    const [, owner, repo, pullNumber] = match;

    // Get token
    const [githubRows] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ?', [project_id]
    );
    const token = githubRows[0]?.github_token || process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: token });

    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner, repo, pull_number: parseInt(pullNumber)
    });

    // Fetch PR files
    const { data: prFiles } = await octokit.pulls.listFiles({
      owner, repo, pull_number: parseInt(pullNumber)
    });

    // Build diff context (cap at 4000 chars)
    let diffContext = prFiles.map(f =>
      `FILE: ${f.filename} [${f.status}] +${f.additions} -${f.deletions}\n${(f.patch || '').substring(0, 500)}`
    ).join('\n---\n').substring(0, 4000);

    const fileNames = prFiles.map(f => f.filename);

    const prompt = `You are a senior code reviewer. Analyse this pull request thoroughly.

PR TITLE: ${pr.title}
PR DESCRIPTION: ${pr.body || 'No description provided'}
AUTHOR: ${pr.user.login}
BASE BRANCH: ${pr.base.ref} ← ${pr.head.ref}
FILES CHANGED (${prFiles.length}): ${fileNames.join(', ')}
TOTAL: +${pr.additions} additions, -${pr.deletions} deletions

CODE DIFF:
${diffContext}

Perform a comprehensive code review checking ALL of the following:
1. CODE QUALITY: complexity, duplication, naming, readability issues
2. MISSING TESTS: are there test files? are new functions covered?
3. SECURITY: SQL injection, XSS, hardcoded secrets, auth bypass, input validation
4. BREAKING CHANGES: what existing functionality could this break?

Respond in exactly this JSON format (no markdown, valid JSON only):
{
  "verdict": "APPROVE" | "REQUEST_CHANGES" | "NEEDS_REVIEW",
  "score": <number 0-100>,
  "summary": "2-3 sentence overall summary",
  "quality": {
    "rating": "good" | "fair" | "poor",
    "issues": ["issue1", "issue2"]
  },
  "tests": {
    "rating": "good" | "fair" | "poor",
    "issues": ["issue1"]
  },
  "security": {
    "rating": "good" | "fair" | "poor",
    "issues": ["issue1"]
  },
  "breaking_changes": {
    "rating": "good" | "fair" | "poor",
    "issues": ["issue1"]
  },
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

    const raw = await callGroq(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    let review;
    try {
      review = JSON.parse(clean);
    } catch (parseErr) {
      return res.json({
        review: {
          verdict: 'NEEDS_REVIEW',
          score: 0,
          summary: clean,
          quality: { rating: 'fair', issues: ['AI returned unstructured response'] },
          tests: { rating: 'fair', issues: [] },
          security: { rating: 'fair', issues: [] },
          breaking_changes: { rating: 'fair', issues: [] },
          recommendations: ['Re-run the review for structured results']
        },
        pr_title: pr.title,
        pr_author: pr.user.login,
        files: fileNames
      });
    }

    // Save to DB for history
    await pool.query(
      `INSERT INTO handoffs
         (project_id, task_id, commit_sha, commit_msg, author, branch,
          files_changed, what_changed, what_pending, who_did_what, brief)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        `pr-${pullNumber}`,
        `PR #${pullNumber}: ${pr.title}`.substring(0, 499),
        pr.user.login,
        pr.head.ref,
        JSON.stringify(fileNames.map(f => ({ name: f, status: 'modified', additions: 0, deletions: 0 }))),
        review.summary,
        review.recommendations?.join('; ') || '',
        `PR #${pullNumber} by ${pr.user.login} — Score: ${review.score}/100`,
        review.summary,
      ]
    );

    res.json({ review, pr_title: pr.title, pr_author: pr.user.login, files: fileNames });
  } catch (error) {
    console.error('PR quality gate error:', error);
    res.status(500).json({ message: 'PR review failed — ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. IMPACT ANALYSER
// POST /api/ai/impact
// Body: { project_id, file_path }
// ─────────────────────────────────────────────────────────────────────────────
const impactAnalyser = async (req, res) => {
  try {
    const { project_id, file_path } = req.body;
    if (!project_id || !file_path) {
      return res.status(400).json({ message: 'project_id and file_path required' });
    }

    // Get repo
    const [githubRows] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ?', [project_id]
    );
    if (!githubRows.length) {
      return res.status(404).json({ message: 'No GitHub repo connected' });
    }
    const { repo_owner, repo_name, github_token } = githubRows[0];

    // Get all tasks
    const [tasks] = await pool.query(
      `SELECT id, title, status, description, github_branch, github_commit_msg
       FROM tasks WHERE project_id = ?`,
      [project_id]
    );

    // Fetch the changed file content
    const fileContent = await fetchFileContent(repo_owner, repo_name, file_path, github_token);

    // Fetch full file tree
    const fileTree = await fetchFileTree(repo_owner, repo_name, github_token);

    // Find potentially related files (same folder, similar name, imports)
    const fileName = file_path.split('/').pop();
    const fileFolder = file_path.split('/').slice(0, -1).join('/');
    const baseName = fileName.replace(/\.[^.]+$/, '').toLowerCase();

    const relatedFiles = fileTree.filter(f =>
      f !== file_path && (
        f.startsWith(fileFolder) ||
        f.toLowerCase().includes(baseName) ||
        (fileContent && fileContent.includes(f.split('/').pop().replace(/\.[^.]+$/, '')))
      )
    ).slice(0, 20);

    // Fetch content of top 3 related files for context
    let relatedContext = '';
    for (const rf of relatedFiles.slice(0, 3)) {
      const content = await fetchFileContent(repo_owner, repo_name, rf, github_token);
      if (content) relatedContext += `\nFILE: ${rf}\n${content.substring(0, 600)}\n`;
    }

    const prompt = `You are a senior developer performing an impact analysis.

CHANGED FILE: ${file_path}
FILE CONTENT:
\`\`\`
${fileContent.substring(0, 2000)}
\`\`\`

RELATED FILES IN REPO:
${relatedFiles.join('\n')}

SAMPLE RELATED CODE:
${relatedContext}

ALL PROJECT TASKS:
${tasks.map(t => `[${t.id}] [${t.status}] ${t.title} — ${t.description || ''} ${t.github_branch ? `(branch: ${t.github_branch})` : ''}`).join('\n')}

Analyse the impact of changing "${file_path}" and respond in exactly this JSON format (no markdown, valid JSON only):
{
  "summary": "2-3 sentence summary of what this file does and why changes to it matter",
  "affected_tasks": [
    { "task_id": <number>, "task_title": "string", "reason": "why this task is affected" }
  ],
  "affected_files": [
    { "file": "path/to/file", "reason": "why it might break or need updating", "risk": "high" | "medium" | "low" }
  ],
  "risk_level": "high" | "medium" | "low",
  "recommendations": ["action1", "action2"]
}`;

    const raw = await callGroq(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    let impact;
    try {
      impact = JSON.parse(clean);
    } catch (parseErr) {
      return res.json({
        impact: {
          summary: clean,
          affected_tasks: [],
          affected_files: [],
          risk_level: 'medium',
          recommendations: ['Re-run the analysis for structured results']
        },
        file_path,
        related_files: relatedFiles
      });
    }

    res.json({ impact, file_path, related_files: relatedFiles });
  } catch (error) {
    console.error('Impact analyser error:', error);
    res.status(500).json({ message: 'Impact analysis failed — ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. AI CODE REVIEW
// POST /api/ai/code-review
// Body: { snippet_id }
// ─────────────────────────────────────────────────────────────────────────────
const aiCodeReview = async (req, res) => {
  try {
    const { snippet_id } = req.body;
    if (!snippet_id) {
      return res.status(400).json({ message: 'snippet_id required' });
    }

    // Fetch snippet
    const [snippets] = await pool.query(
      'SELECT * FROM code_snippets WHERE id = ?', [snippet_id]
    );
    if (!snippets.length) {
      return res.status(404).json({ message: 'Snippet not found' });
    }
    const snippet = snippets[0];
    const lines = snippet.code_content.split('\n');

    const prompt = `You are a senior code reviewer. Review this ${snippet.language} code thoroughly.

CODE (${snippet.language}):
\`\`\`${snippet.language}
${lines.map((l, i) => `${i + 1}: ${l}`).join('\n')}
\`\`\`

Analyse for: bugs, security issues, performance problems, code style, best practices.

Respond in exactly this JSON format (no markdown, valid JSON only):
{
  "summary": "2-3 sentence overall assessment",
  "score": <number 0-100>,
  "comments": [
    { "line": <line_number>, "content": "specific feedback for this line", "severity": "critical" | "warning" | "suggestion" }
  ]
}

Rules:
- Only include comments for lines that actually need feedback
- Be specific and actionable
- Include 3-8 comments max
- Line numbers must match the code above`;

    const raw = await callGroq(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    let review;
    try {
      review = JSON.parse(clean);
    } catch {
      return res.json({
        summary: clean,
        score: 0,
        comments_added: 0,
        message: 'AI returned unstructured response'
      });
    }

    // Auto-insert AI comments into DB
    let added = 0;
    if (review.comments && Array.isArray(review.comments)) {
      for (const c of review.comments) {
        if (c.line && c.content && c.line >= 1 && c.line <= lines.length) {
          const severity = c.severity || 'suggestion';
          const prefix = severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '💡';
          await pool.query(
            `INSERT INTO code_comments (snippet_id, user_id, content, line_number, status)
             VALUES (?, ?, ?, ?, 'open')`,
            [snippet_id, req.userId, `${prefix} [AI] ${c.content}`, c.line]
          );
          added++;
        }
      }
    }

    res.json({
      summary: review.summary,
      score: review.score,
      comments_added: added,
      comments: review.comments || []
    });
  } catch (error) {
    console.error('AI code review error:', error);
    res.status(500).json({ message: 'AI code review failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI SPRINT PLANNER — ESTIMATE STORY POINTS
// POST /api/ai/estimate
// Body: { project_id }
// ─────────────────────────────────────────────────────────────────────────────
const aiEstimatePoints = async (req, res) => {
  try {
    const { project_id } = req.body;
    if (!project_id) {
      return res.status(400).json({ message: 'project_id required' });
    }

    // Get tasks with 0 or no story points
    const [tasks] = await pool.query(
      `SELECT id, title, description, priority, status FROM tasks
       WHERE project_id = ? AND (story_points IS NULL OR story_points = 0)
       ORDER BY created_at DESC LIMIT 20`,
      [project_id]
    );

    if (!tasks.length) {
      return res.json({ estimates: [], message: 'No unestimated tasks found' });
    }

    // Get completed tasks for reference (so AI learns the team's scale)
    const [doneTasks] = await pool.query(
      `SELECT title, story_points, priority FROM tasks
       WHERE project_id = ? AND story_points > 0 AND status = 'done'
       ORDER BY created_at DESC LIMIT 10`,
      [project_id]
    );

    const prompt = `You are an agile project manager estimating story points for tasks.

${doneTasks.length > 0 ? `REFERENCE — completed tasks with their points (use as calibration):
${doneTasks.map(t => `- "${t.title}" [${t.priority}] = ${t.story_points} pts`).join('\n')}
` : 'No reference tasks available. Use standard Fibonacci scale (1,2,3,5,8,13).'}

TASKS TO ESTIMATE:
${tasks.map(t => `- ID:${t.id} | "${t.title}" | ${t.description || 'No description'} | Priority: ${t.priority}`).join('\n')}

Respond in exactly this JSON format (no markdown, valid JSON only):
{
  "estimates": [
    { "task_id": <number>, "title": "task title", "points": <number 1-13>, "reasoning": "brief reason" }
  ]
}

Rules:
- Use Fibonacci scale: 1, 2, 3, 5, 8, 13
- Consider complexity, priority, and description
- Be consistent with the reference tasks if available`;

    const raw = await callGroq(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return res.json({ estimates: [], message: 'AI returned unstructured response: ' + clean.substring(0, 200) });
    }

    res.json({ estimates: result.estimates || [] });
  } catch (error) {
    console.error('AI estimate error:', error);
    res.status(500).json({ message: 'AI estimation failed' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. AI TASK BREAKDOWN
// POST /api/ai/breakdown
// Body: { project_id, feature_description }
// ─────────────────────────────────────────────────────────────────────────────
const aiTaskBreakdown = async (req, res) => {
  try {
    const { project_id, feature_description } = req.body;
    if (!project_id || !feature_description) {
      return res.status(400).json({ message: 'project_id and feature_description required' });
    }

    // Get existing tasks for context
    const [existingTasks] = await pool.query(
      `SELECT title, status, priority FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT 15`,
      [project_id]
    );

    // Get project info
    const [projects] = await pool.query(
      'SELECT name, description FROM projects WHERE id = ?', [project_id]
    );

    const prompt = `You are a senior developer breaking down a feature into actionable development tasks.

PROJECT: ${projects[0]?.name || 'Unknown'} — ${projects[0]?.description || ''}

EXISTING TASKS (avoid duplicates):
${existingTasks.map(t => `- [${t.status}] ${t.title}`).join('\n')}

FEATURE TO BREAK DOWN:
"${feature_description}"

Create 3-8 development sub-tasks. Respond in exactly this JSON format (no markdown, valid JSON only):
{
  "tasks": [
    {
      "title": "concise task title",
      "description": "1-2 sentence description of what to implement",
      "priority": "p1" | "p2" | "p3" | "p4",
      "story_points": <number 1-13 fibonacci>
    }
  ]
}

Rules:
- Tasks should be specific and actionable (e.g. "Create user registration API endpoint" not "Handle auth")
- Order tasks by dependency (what should be done first)
- Use priorities: p1=critical, p2=high, p3=medium, p4=low
- Include both frontend and backend tasks if applicable
- Don't duplicate existing tasks`;

    const raw = await callGroq(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      return res.json({ tasks: [], message: 'AI returned unstructured response: ' + clean.substring(0, 200) });
    }

    res.json({ tasks: result.tasks || [] });
  } catch (error) {
    console.error('AI breakdown error:', error);
    res.status(500).json({ message: 'AI task breakdown failed' });
  }
};

module.exports = { ragChat, prQualityGate, impactAnalyser, aiCodeReview, aiEstimatePoints, aiTaskBreakdown, indexProject, getIndexStatus };