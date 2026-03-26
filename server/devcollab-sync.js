/**
 * DevCollab VS Code Sync Daemon
 * Usage: node devcollab-sync.js <YOUR_PROJECT_ID> <YOUR_DEVCOLLAB_JWT_TOKEN> [PORT]
 * Example:
 * node devcollab-sync.js 1 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const chokidar = require('chokidar');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const projectId = process.argv[2];
const token = process.argv[3];
const port = process.argv[4] || 5000;

if (!projectId || !token) {
  console.error('❌ Missing arguments.');
  console.log('Usage: node devcollab-sync.js <PROJECT_ID> <YOUR_JWT_TOKEN> [PORT]');
  process.exit(1);
}

const API_URL = `http://localhost:${port}/api/codereview/sync-local`;
const watchDir = process.cwd();

console.log(`\n👁️ DevCollab Sync Daemon started on: ${watchDir}`);
console.log(`🔗 Project ID: ${projectId}`);
console.log('Connecting to DevCollab, waiting for file saves within the workspace...\n');

// Initialize watcher (ignore node_modules, .git, .env)
const watcher = chokidar.watch('.', {
  ignored: /(^|[\/\\])\..|node_modules|.env|devcollab-sync.js/, 
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
});

let syncTaskId = null;

// Determine language from extension
const getLanguage = (ext) => {
  const map = {
    '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
    '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.go': 'go',
    '.css': 'css', '.html': 'html', '.sql': 'sql', '.json': 'json', '.md': 'markdown'
  };
  return map[ext.toLowerCase()] || 'text';
};

const getCommentPrefix = (lang) => {
  if (['python', 'ruby', 'bash', 'yaml'].includes(lang)) return '#';
  if (['html', 'xml'].includes(lang)) return '<!--';
  if (['sql'].includes(lang)) return '--';
  return '//'; // js, ts, java, c++, c, css
};

// Handle file change
watcher.on('change', async (filePath) => {
  const absolutePath = path.resolve(watchDir, filePath);
  console.log(`✍️ Detected save on: ${filePath}`);

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const ext = path.extname(absolutePath);
    const lang = getLanguage(ext);
    const prefix = getCommentPrefix(lang);
    
    // We embed the absolute path inside the code content as a specific comment format
    // so the frontend can parse it and build the `vscode://file/...` deep link!
    const syncHeader = `${prefix} SYNCED_FILE: ${absolutePath}\n${prefix} SYNCED_TIME: ${new Date().toLocaleTimeString()}\n\n`;
    const finalContent = syncHeader + content.substring(0, 50000); // cap size just in case

    const response = await axios.post(
      API_URL, 
      {
        project_id: projectId,
        file_path: absolutePath,
        code_content: finalContent,
        language: lang,
        task_id_override: syncTaskId
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log(`✅ Synced ${path.basename(filePath)} to Code Review! (Snippet ID: ${response.data.snippetId})`);
    
    // Save the global sync task ID so future saves go to the same VS Code Sync task bucket
    if (response.data.taskId && !syncTaskId) {
      syncTaskId = response.data.taskId;
    }
  } catch (error) {
    console.error(`❌ Sync failed for ${filePath}: ${error.response?.data?.message || error.message}`);
  }
});
