require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

async function migrate() {
  try {
    console.log('🔧 Migrating users table: adding auth-related columns...');

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'master',
      ADD COLUMN IF NOT EXISTS browser_login TEXT,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_browser_login ON users(browser_login);
    `);

    console.log('✅ Migration completed successfully.');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };