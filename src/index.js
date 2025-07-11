require('dotenv').config();

const express = require('express');

const {
  loadDatabaseConfigs,
  pools,
  shutdown,
  scrapeDatabase
} = require('./db');

const {
  register,
  exporterErrors,
  scrapeDuration,
  scrapeSuccess,
  scrapeLockouts,
} = require('./metrics');

const {
  loadCustomMetrics,
} = require('./customMetrics');

const createAuthMiddleware = require('./auth');

const authMiddleware = createAuthMiddleware(process.env.EXPORTER_API_KEY);

const app = express();

const rateLimit = require('express-rate-limit');

// --- Config ---
const PORT = process.env.PORT || 9187;
let isScraping = false;

// --- DB config
loadDatabaseConfigs(process.env.DBS_CONFIG_FILE);

// --- Startup Logging ---
console.log(`Exporter starting on port ${PORT}`);
console.log(`Auth enabled: ${!!process.env.EXPORTER_API_KEY}`);
console.log(`Using queries file: ${process.env.QUERIES_FILE}`);

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
  const scrapePromises = pools.map(({ name, pool }) => scrapeDatabase(name, pool));

  const scrapeResults = await Promise.allSettled(scrapePromises);

  scrapeResults.forEach((result, idx) => {
    const dbName = pools[idx].name;

    if (result.status === 'fulfilled') {
      scrapeSuccess.labels(dbName).set(1);
    } else {
      exporterErrors.inc();
      scrapeSuccess.labels(dbName).set(0);
    }
  });
}

// --- /metrics route ---
app.get('/metrics', authMiddleware, metricsLimiter, async (_, res) => {
  if (isScraping) {
    scrapeLockouts.inc();
    return res.status(429).send('# Scrape already in progress\n');
  }

  isScraping = true;

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
  } finally {
    isScraping = false;
  }
});

// --- Registering Health Endpoints ---
const registerHealthEndpoints = require('./health');
registerHealthEndpoints(app, pools);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Exporter listening on http://localhost:${PORT}/metrics`);
});

// --- Graceful Shutdown ---
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
