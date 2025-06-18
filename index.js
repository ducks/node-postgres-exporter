require('dotenv').config();

const fs = require('fs');
const path = require('path');

const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

// --- Config ---
const PORT = process.env.PORT || 9187;
const API_KEY = process.env.EXPORTER_API_KEY || null;

const QUERIES_PATH = process.env.QUERIES_FILE || path.join(__dirname, 'queries.json');

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

register.setDefaultLabels({ exporter: 'custom_pg_exporter' });

// --- Metrics ---
const pgActiveConnections = new client.Gauge({
  name: 'pg_active_connections',
  help: 'Number of active PostgreSQL connections',
});

register.registerMetric(pgActiveConnections);

const pgDatabaseSize = new client.Gauge({
  name: 'pg_database_size_bytes',
  help: 'Database size in bytes',
  labelNames: ['database'],
});

register.registerMetric(pgDatabaseSize);

const exporterUp = new client.Gauge({
  name: 'exporter_up',
  help: 'Exporter process is running',
});

register.registerMetric(exporterUp);
exporterUp.set(1);

const scrapeDuration = new client.Gauge({
  name: 'exporter_scrape_duration_seconds',
  help: 'Duration of last scrape in seconds',
});

register.registerMetric(scrapeDuration);

const exporterErrors = new client.Counter({
  name: 'exporter_errors_total',
  help: 'Total scrape errors encountered',
});

register.registerMetric(exporterErrors);


const customMetrics = [];

function loadCustomMetrics() {
  if (!fs.existsSync(QUERIES_PATH)) {
    console.warn(`[WARN] No queries file found at ${QUERIES_PATH}`);
    return;
  }

  let queries;
  try {
    queries = JSON.parse(fs.readFileSync(QUERIES_PATH, 'utf8'));
  } catch (err) {
    console.error(`[ERROR] Failed to parse queries file: ${err.message}`);
    return;
  }

  if (!Array.isArray(queries)) {
    console.error('[ERROR] queries.json must contain an array of query objects');
    return;
  }

  queries.forEach((q, i) => {
    const { name, help, type = 'gauge', labels = [], query } = q;
    console.log(q);

    if (!name || !help || !query) {
      console.warn(`[SKIP] Query entry #${i} is missing required fields.`);
      return;
    }

    if (type !== 'gauge') {
      console.warn(`[SKIP] Only 'gauge' type is supported for now: ${name}`);
      return;
    }

    try {
      const metric = new client.Gauge({
        name,
        help,
        labelNames: labels,
      });

      register.registerMetric(metric);

      customMetrics.push({ definition: q, instance: metric });
    } catch (err) {
      console.error(`[ERROR] Failed to register metric "${name}": ${err.message}`);
    }
  });

  console.log(`[INFO] Loaded ${customMetrics.length} custom metrics`);
}

loadCustomMetrics();

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

    // Custom metrics from queries.json
    for (const { definition, instance } of customMetrics) {
      try {
        const result = await client.query(definition.query);

        result.rows.forEach(row => {
          const labels = {};
          let value = null;
          let valueFieldUsed = definition.valueField || null;

          for (const key in row) {
            if (definition.labels.includes(key)) {
              labels[key] = row[key];
            } else if (
              !valueFieldUsed &&
              typeof row[key] === 'number' &&
              value === null
            ) {
              valueFieldUsed = key;
              value = row[key];
            } else if (key === valueFieldUsed) {
              value = row[key];
            }
          }

          if (value !== null) {
            instance.set(labels, value);
          } else {
            console.warn(
              `[CUSTOM] No numeric value found for "${definition.name}" row:`,
              row
            );
          }
        });
      } catch (err) {
        console.error(`[CUSTOM] Failed to run "${definition.name}":`, err.message);
      }
    }
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
app.get('/metrics', authMiddleware, async (_, res) => {
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
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

