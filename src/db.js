require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pools = [];

const {
  exporterErrors,
  pgActiveConnections,
  pgDatabaseSize,
  scrapeSuccess,
  perDbScrapeDuration,
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

    pool.on('error', (err) => {
      console.error(`[POOL ERROR] DB ${db.name}: ${err.message}`);
      exporterErrors.inc();
      scrapeSuccess.labels(db.name).set(0);
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

async function scrapeDatabase(name, pool) {
  const client = await pool.connect();
  const start = Date.now();

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

    await collectCustomMetrics(client, name);

  } catch (err) {
    throw { name, error: err.message };
  } finally {
    client.release();

    const duration = (Date.now() - start) / 1000;
    perDbScrapeDuration.set({ db: name }, duration);
  }
}

module.exports = {
  loadDatabaseConfigs,
  pools,
  shutdown,
  scrapeDatabase,
}
