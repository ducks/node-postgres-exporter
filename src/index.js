require('dotenv').config();

const express = require('express');

const {
  loadDatabaseConfigs,
  pools,
  shutdown
} = require('./db');

const {
  register,
  exporterErrors,
  scrapeDuration,
  pgActiveConnections,
  pgDatabaseSize
} = require('./metrics');

const {
  loadCustomMetrics,
  collectCustomMetrics
} = require('./customMetrics');

const createAuthMiddleware = require('./auth');

const authMiddleware = createAuthMiddleware(process.env.EXPORTER_API_KEY);

const app = express();

const rateLimit = require('express-rate-limit');

// --- Registering Health Endpoints ---
const registerHealthEndpoints = require('./health');
registerHealthEndpoints(app, pools);

// --- Config ---
const PORT = process.env.PORT || 9187;

// --- DB config
loadDatabaseConfigs(process.env.DBS_CONFIG_FILE);

// --- Startup Logging ---
console.log(`Exporter starting on port ${PORT}`);
console.log(`Auth enabled: ${!!process.env.EXPORTER_API_KEY}`);
console.log(`Using queries file: ${process.env.QUERIES_FILE || 'queries.json'}`);

// --- Rate limit config ---
const metricsLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 2, // allow 2 requests every 5s
  standardHeaders: true,
  legacyHeaders: false,
});

loadCustomMetrics(register);

// --- Metric Collector ---
async function collectMetrics() {
  for (const { name: dbName, pool } of pools) {
    const client = await pool.connect();

    try {
      // Get active connections
      const activeRes = await client.query(`
      SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'
    `);
     pgActiveConnections.set({ db: dbName }, parseInt(activeRes.rows[0].count, 10));

      // Get size of current database
      const sizeRes = await client.query(`
      SELECT pg_database.datname, pg_database_size(pg_database.datname) AS size
      FROM pg_database WHERE datistemplate = false
    `);
      sizeRes.rows.forEach(row => {
        pgDatabaseSize.set(
          {
            db: dbName,
            database: row.datname
          },
          parseInt(row.size, 10)
        );
      });

      await collectCustomMetrics(client, dbName);

    } catch (err) {
      console.error('[COLLECT] Failed to gather metrics:', err.message);
    } finally {
      client.release();
    }
  }
}

// --- /metrics route ---
app.get('/metrics', authMiddleware, metricsLimiter, async (_, res) => {
  const start = Date.now();

  let scrapeFailed = false;

  try {
    await collectMetrics();
  } catch (err) {
    console.error('[ERROR] Failed to collect metrics:', err);
    exporterErrors.inc();
    scrapeFailed = true;
  } finally {
    scrapeDuration.set((Date.now() - start) / 1000);
  }

  if (scrapeFailed) {
    // If collection failed, return scrape error response
    res.status(500).send('# Exporter scrape failed\n');
    return;
  }

  try {
    // Only generate metrics if scrape succeeded
    const metrics = await register.metrics();
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  } catch (err) {
    // This very rarely fails (prom-client error)
    console.error('[ERROR] Failed to generate metrics output:', err);
    res.status(500).send('# Exporter output failure\n');
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Exporter listening on http://localhost:${PORT}/metrics`);
});

// --- Graceful Shutdown ---
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
