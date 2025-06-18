require('dotenv').config();
const { Pool } = require('pg');

// --- Postgres Pool ---
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  port: process.env.DB_PORT || 5432,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

async function shutdown() {
  console.log('Shutting down gracefully...');

  try {
    await pool.end();  // Close Postgres pool
    console.log('Database pool closed');
  } catch (err) {
    console.error('Error during pool shutdown:', err);
  } finally {
    process.exit(0);
  }
}

module.exports = {
  pool,
  shutdown
}
