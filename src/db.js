require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pools = [];

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

module.exports = {
  loadDatabaseConfigs,
  pools,
  shutdown
}
