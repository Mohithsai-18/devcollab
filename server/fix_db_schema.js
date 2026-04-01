const mysql = require('mysql2/promise');

const dbUrl = 'mysql://root:rbVrOmYBOUkxtFbytRVatbdGwfCRUcFe@interchange.proxy.rlwy.net:18649/railway';

async function fix() {
  let connection;
  try {
    console.log('Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbUrl + '?multipleStatements=true');
    console.log('Connection successful!');

    console.log('Adding is_active column...');
    try {
      await connection.query('ALTER TABLE project_github ADD COLUMN is_active TINYINT(1) DEFAULT 0');
      console.log('is_active column added!');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAME') console.log('is_active column already exists.');
      else throw e;
    }

    console.log('Adding nickname column...');
    try {
      await connection.query('ALTER TABLE project_github ADD COLUMN nickname VARCHAR(255)');
      console.log('nickname column added!');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAME') console.log('nickname column already exists.');
      else throw e;
    }
    
    console.log('DATABASE COLUMNS UPDATED SUCCESSFULLY!');

  } catch (error) {
    console.error('ERROR during fix:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

fix();
