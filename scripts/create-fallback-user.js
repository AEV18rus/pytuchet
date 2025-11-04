require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createFallbackUser() {
  try {
    console.log('Checking for fallback user...');
    
    // Проверяем, существует ли fallback пользователь
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [87654321]
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Fallback user already exists:', checkResult.rows[0]);
      return;
    }
    
    // Создаем fallback пользователя
    const insertResult = await pool.query(
      `INSERT INTO users (telegram_id, first_name, last_name, username, display_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [87654321, 'Test', 'User', 'testuser', 'Test User', 'demo']
    );
    
    console.log('Fallback user created:', insertResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createFallbackUser();