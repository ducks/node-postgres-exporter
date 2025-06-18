require('dotenv').config();

const express = require('express');

const {
  pool,
  shutdown_gracefully
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

const app = express();

const rateLimit = require('express-rate-limit');

// --- Config ---
const PORT = process.env.PORT || 9187;
const API_KEY = process.env.EXPORTER_API_KEY || null;


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
  const client = await pool.connect();
  try {
    // Get active connections
    const activeRes = await client.query(`
      SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'
    `);
    pgActiveConnections.set(parseInt(activeRes.rows[0].count, 10));

    // Get size of current database
    const sizeRes = await client.query(`
      SELECT pg_database.datname, pg_database_size(pg_database.datname) AS size
      FROM pg_database WHERE datistemplate = false
    `);
    sizeRes.rows.forEach(row => {
      pgDatabaseSize.set({ database: row.datname }, parseInt(row.size, 10));
    });

    await collectCustomMetrics(client);

  } catch (err) {
    console.error('[COLLECT] Failed to gather metrics:', err.message);
  } finally {
    client.release();
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const expected = `Bearer ${API_KEY}`;

  if (!authHeader || authHeader !== expected) {
    return res.status(403).send('Forbidden');
  }

  next();
}

// --- /metrics route ---
app.get('/metrics', authMiddleware, metricsLimiter, async (_, res) => {
  const start = Date.now();

  try {
    await collectMetrics();

  } catch (err) {
    console.error('[ERROR] Failed to collect metrics:', err);
    exporterErrors.inc();
    res.status(500).send('# Exporter error\n');
  } finally {
    scrapeDuration.set((Date.now() - start) / 1000);
  }

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// --- Healthcheck ---
app.get('/healthz', (_, res) => res.send('OK'));

// --- Readiness probe
app.get('/readyz', async (_, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    res.send('OK');
  } catch (err) {
    res.status(500).send('Not Ready');
  }
});

app.get('/livez', (_, res) => {
  res.status(200).send('OK');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Exporter listening on http://localhost:${PORT}/metrics`);
});

// --- Graceful Shutdown ---
process.on('SIGINT', shutdown_gracefully);
process.on('SIGTERM', shutdown_gracefully);
