const mysql = require('mysql2/promise');
const { Octokit } = require('@octokit/rest');

const dbUrl = 'mysql://root:rbVrOmYBOUkxtFbytRVatbdGwfCRUcFe@interchange.proxy.rlwy.net:18649/railway';

async function testConnect() {
  let connection;
  try {
    console.log('--- TEST CONNECT SCRIPT ---');
    connection = await mysql.createConnection(dbUrl);
    
    // Simulate req.body from screenshot
    // Repo: automated-resume-relevance-checker
    // Owner: rk3742 (guessing from the screenshot's small text)
    const project_id = 1;
    const repo_owner = 'rk3742';
    const repo_name = 'automated-resume-relevance-checker';
    const nickname = 'automated-resume-relevance-checker';

    console.log(`Trying to connect ${repo_owner}/${repo_name} to project ${project_id}...`);
    
    // Verify columns first
    console.log('Checking table columns...');
    const [cols] = await connection.query('SHOW COLUMNS FROM project_github');
    const columnNames = cols.map(c => c.Field);
    console.log('Columns found:', columnNames);

    console.log('Running check for existing repo...');
    const [existing] = await connection.query(
      'SELECT id FROM project_github WHERE project_id = ? AND repo_owner = ? AND repo_name = ?',
      [project_id, repo_owner, repo_name]
    );
    console.log('Existing repos check completed. Count:', existing.length);

    console.log('Deactivating others...');
    await connection.query('UPDATE project_github SET is_active = 0 WHERE project_id = ?', [project_id]);

    console.log('Inserting new connection...');
    await connection.query(
      `INSERT INTO project_github (project_id, repo_owner, repo_name, is_active, nickname)
       VALUES (?, ?, ?, 1, ?)`,
      [project_id, repo_owner, repo_name, nickname]
    );
    
    console.log('SUCCESS! Manual connect worked.');

  } catch (error) {
    console.error('FAILED with error code:', error.code);
    console.error('ERROR message:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

testConnect();
