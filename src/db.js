require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pools = [];

const {
  pgActiveConnections,
  pgDatabaseSize
} = require('./metrics');

const { collectCustomMetrics } = require('./customMetrics');

function loadDatabaseConfigs(configFilePath) {
  const configPath = configFilePath || './databases.json';

  let configs;

  try {
    configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(`[ERROR] Failed to load DB config: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(configs.databases)) {
    console.error('[ERROR] Invalid config: "databases" must be an array');
    process.exit(1);
  }

  configs.databases.forEach(db => {
    if (!db.name || !db.host || !db.user || !db.pass || !db.database) {
      console.error(`[ERROR] Invalid DB entry: ${JSON.stringify(db)}`);
      process.exit(1);
    }

    const pool = new Pool({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.pass,
      database: db.database,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });

    pools.push({ name: db.name, pool });
  });

  console.log(`[INFO] Loaded ${pools.length} database configs`);
}

async function shutdown() {
  console.log('Shutting down gracefully...');

  for (const { name, pool } of pools) {
    try {
      await pool.end();
      console.log(`[SHUTDOWN] Closed pool for ${name}`);
    } catch (err) {
      console.error(`[SHUTDOWN] Failed to close pool for ${name}: ${err.message}`);
    }
  }

  process.exit(0);
}

async function scrapeDatabase({ name, pool }) {
  const client = await pool.connect();

  try {
    // Core metrics:
    const activeRes = await client.query(`
      SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'
    `);
    pgActiveConnections.set({ db: name }, parseInt(activeRes.rows[0].count, 10));

    const sizeRes = await client.query(`
      SELECT pg_database.datname, pg_database_size(pg_database.datname) AS size
      FROM pg_database WHERE datistemplate = false
    `);

    sizeRes.rows.forEach(row => {
      pgDatabaseSize.set({ database: row.datname, db: name }, parseInt(row.size, 10));
    });

    await collectCustomMetrics(client, name); // Pass db name

  } catch (err) {
    console.error(`[SCRAPE] Failed for DB ${name}:`, err.message);
    throw err;  // Optional: fail fast for this DB scrape
  } finally {
    client.release();
  }
}

module.exports = {
  loadDatabaseConfigs,
  pools,
  shutdown,
  scrapeDatabase,
}
