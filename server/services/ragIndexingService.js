/**
 * RAG Indexing Service — Indexes project data into ChromaDB
 * Pulls from: GitHub files, tasks, handoffs, code snippets
 */

const pool = require('../config/db');
const { Octokit } = require('@octokit/rest');
const vectorStore = require('./vectorStoreService');

// ── Text splitter for chunking large files ─────────────────────────────────
const chunkText = (text, chunkSize = 500, overlap = 50) => {
  const chunks = [];
  if (!text || text.length === 0) return chunks;
  
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start += chunkSize - overlap;
    if (end >= text.length) break;
  }
  return chunks;
};

// ── Fetch file content from GitHub ──────────────────────────────────────────
const fetchFileContent = async (owner, repo, path, token) => {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf8');
    }
    return data.content || '';
  } catch { return ''; }
};

// ── Fetch repo file tree ────────────────────────────────────────────────────
const fetchFileTree = async (owner, repo, token) => {
  const octokit = new Octokit({ auth: token || process.env.GITHUB_TOKEN });
  try {
    const { data } = await octokit.git.getTree({
      owner, repo, tree_sha: 'HEAD', recursive: '1',
    });
    return data.tree
      .filter(f => f.type === 'blob')
      .map(f => f.path)
      .filter(p =>
        !p.includes('node_modules') &&
        !p.includes('.git') &&
        !p.includes('package-lock') &&
        !p.includes('.min.') &&
        !p.endsWith('.map') &&
        !p.endsWith('.ico') &&
        !p.endsWith('.png') &&
        !p.endsWith('.jpg') &&
        !p.endsWith('.svg') &&
        !p.endsWith('.woff') &&
        !p.endsWith('.woff2') &&
        !p.endsWith('.ttf') &&
        !p.endsWith('.eot')
      );
  } catch { return []; }
};

// Code file extensions worth indexing in full
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.rs',
  '.css', '.scss', '.html', '.vue', '.svelte', '.json', '.yaml', '.yml',
  '.md', '.txt', '.sql', '.sh', '.bash', '.env.example', '.dockerfile',
]);

const isCodeFile = (path) => {
  const ext = '.' + path.split('.').pop().toLowerCase();
  return CODE_EXTENSIONS.has(ext);
};

// ── Update index status in MySQL ────────────────────────────────────────────
const updateIndexStatus = async (projectId, status, docsIndexed = 0, errorMessage = null) => {
  await pool.query(
    `INSERT INTO rag_index_status (project_id, status, docs_indexed, last_indexed_at, error_message)
     VALUES (?, ?, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE status = ?, docs_indexed = ?, last_indexed_at = NOW(), error_message = ?`,
    [projectId, status, docsIndexed, errorMessage, status, docsIndexed, errorMessage]
  );
};

// ── Get index status ────────────────────────────────────────────────────────
const getIndexStatus = async (projectId) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM rag_index_status WHERE project_id = ?', [projectId]
    );
    return rows[0] || { project_id: projectId, status: 'idle', docs_indexed: 0 };
  } catch (err) {
    // Table may not exist yet
    return { project_id: projectId, status: 'idle', docs_indexed: 0 };
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN: Index an entire project
// ══════════════════════════════════════════════════════════════════════════════
const indexProject = async (projectId) => {
  console.log(`🔄 Starting RAG indexing for project ${projectId}...`);
  await updateIndexStatus(projectId, 'indexing');

  try {
    // Delete old collection first (full re-index)
    await vectorStore.deleteCollection(projectId);

    const allDocs = [];
    let docIdCounter = 0;
    const makeId = () => `doc_${projectId}_${docIdCounter++}`;

    // ── 1. Index GitHub files ──────────────────────────────────────────────
    const [githubRows] = await pool.query(
      'SELECT * FROM project_github WHERE project_id = ?', [projectId]
    );

    if (githubRows.length) {
      const { repo_owner, repo_name, github_token } = githubRows[0];
      const fileTree = await fetchFileTree(repo_owner, repo_name, github_token);

      console.log(`  📁 Found ${fileTree.length} files in repo ${repo_owner}/${repo_name}`);

      // Only index code files, limit to 80 files max to avoid API rate limits
      const codeFiles = fileTree.filter(isCodeFile).slice(0, 80);
      console.log(`  📄 Indexing ${codeFiles.length} code files...`);

      for (const filePath of codeFiles) {
        try {
          const content = await fetchFileContent(repo_owner, repo_name, filePath, github_token);
          if (!content || content.length < 20) continue;

          // Chunk large files
          const chunks = chunkText(content, 500, 50);
          for (let i = 0; i < chunks.length; i++) {
            allDocs.push({
              id: makeId(),
              content: `File: ${filePath}\n\n${chunks[i]}`,
              metadata: {
                source: 'github',
                type: 'code',
                file_path: filePath,
                chunk_index: i,
                project_id: String(projectId),
              },
            });
          }
        } catch (err) {
          console.warn(`  ⚠️ Failed to fetch ${filePath}:`, err.message);
        }
      }
    }

    // ── 2. Index Tasks ─────────────────────────────────────────────────────
    const [tasks] = await pool.query(
      `SELECT id, title, status, description, priority, github_branch, github_commit_msg
       FROM tasks WHERE project_id = ? ORDER BY created_at DESC LIMIT 50`,
      [projectId]
    );

    console.log(`  📋 Indexing ${tasks.length} tasks...`);
    for (const task of tasks) {
      const content = [
        `Task: ${task.title}`,
        `Status: ${task.status}`,
        `Priority: ${task.priority || 'none'}`,
        task.description ? `Description: ${task.description}` : '',
        task.github_branch ? `Branch: ${task.github_branch}` : '',
        task.github_commit_msg ? `Commit: ${task.github_commit_msg}` : '',
      ].filter(Boolean).join('\n');

      allDocs.push({
        id: makeId(),
        content,
        metadata: {
          source: 'database',
          type: 'task',
          task_id: String(task.id),
          task_status: task.status,
          project_id: String(projectId),
        },
      });
    }

    // ── 3. Index Handoffs ──────────────────────────────────────────────────
    const [handoffs] = await pool.query(
      `SELECT id, commit_msg, author, branch, brief, what_changed, what_pending, who_did_what
       FROM handoffs WHERE project_id = ? ORDER BY created_at DESC LIMIT 30`,
      [projectId]
    );

    console.log(`  🤝 Indexing ${handoffs.length} handoffs...`);
    for (const h of handoffs) {
      const content = [
        `Handoff by ${h.author} on branch ${h.branch}`,
        `Commit: ${h.commit_msg}`,
        h.brief ? `Brief: ${h.brief}` : '',
        h.what_changed ? `Changed: ${h.what_changed}` : '',
        h.what_pending ? `Pending: ${h.what_pending}` : '',
        h.who_did_what ? `Who did what: ${h.who_did_what}` : '',
      ].filter(Boolean).join('\n');

      allDocs.push({
        id: makeId(),
        content,
        metadata: {
          source: 'database',
          type: 'handoff',
          handoff_id: String(h.id),
          author: h.author || '',
          project_id: String(projectId),
        },
      });
    }

    // ── 4. Index Code Snippets ─────────────────────────────────────────────
    const [snippets] = await pool.query(
      `SELECT id, title, language, code_content
       FROM code_snippets WHERE project_id = ? ORDER BY created_at DESC LIMIT 30`,
      [projectId]
    );

    console.log(`  💻 Indexing ${snippets.length} code snippets...`);
    for (const s of snippets) {
      const content = `Code Snippet: ${s.title || 'Untitled'} (${s.language || 'unknown'})\n\n${s.code_content}`;
      const chunks = chunkText(content, 500, 50);

      for (let i = 0; i < chunks.length; i++) {
        allDocs.push({
          id: makeId(),
          content: chunks[i],
          metadata: {
            source: 'database',
            type: 'snippet',
            snippet_id: String(s.id),
            language: s.language || '',
            project_id: String(projectId),
          },
        });
      }
    }

    // ── 5. Embed & store all documents ──────────────────────────────────────
    console.log(`  🧠 Embedding ${allDocs.length} document chunks...`);
    await vectorStore.addDocuments(projectId, allDocs);

    await updateIndexStatus(projectId, 'ready', allDocs.length);
    console.log(`✅ RAG indexing complete for project ${projectId}: ${allDocs.length} chunks indexed`);

    return { success: true, docs_indexed: allDocs.length };
  } catch (error) {
    console.error(`❌ RAG indexing failed for project ${projectId}:`, error);
    await updateIndexStatus(projectId, 'error', 0, error.message);
    throw error;
  }
};

// ── Re-index (alias that drops + re-indexes) ───────────────────────────────
const reindexProject = async (projectId) => {
  return indexProject(projectId); // indexProject already drops old collection
};

module.exports = { indexProject, reindexProject, getIndexStatus, updateIndexStatus };
