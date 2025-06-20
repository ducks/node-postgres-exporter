const client = require('prom-client');

// Create a new registry
const register = new client.Registry();
register.setDefaultLabels({ exporter: 'custom_pg_exporter' });

// Exporter health metrics
const exporterUp = new client.Gauge({
  name: 'exporter_up',
  help: 'Exporter process is running',
});
exporterUp.set(1);
register.registerMetric(exporterUp);

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

// Core PostgreSQL metrics
const pgActiveConnections = new client.Gauge({
  name: 'pg_active_connections',
  help: 'Number of active PostgreSQL connections',
  labelNames: ['db'],
});
register.registerMetric(pgActiveConnections);

const pgDatabaseSize = new client.Gauge({
  name: 'pg_database_size_bytes',
  help: 'Database size in bytes',
  labelNames: ['db', 'database'],
});
register.registerMetric(pgDatabaseSize);

const scrapeSuccess = new client.Gauge({
  name: 'pg_scrape_success',
  help: 'Database scrape success (1=success, 0=failure)',
  labelNames: ['db'],
});
register.registerMetric(scrapeSuccess);

const perDbScrapeDuration = new client.Gauge({
  name: 'pg_scrape_duration_seconds',
  help: 'Scrape duration per database',
  labelNames: ['db'],
});
register.registerMetric(perDbScrapeDuration);

const scrapeLockouts = new client.Counter({
  name: 'exporter_scrape_lockouts_total',
  help: 'Number of scrape requests rejected due to concurrency lock',
});
register.registerMetric(scrapeLockouts);

// Export everything we need
module.exports = {
  client,
  register,
  exporterUp,
  scrapeDuration,
  exporterErrors,
  pgActiveConnections,
  pgDatabaseSize,
  scrapeSuccess,
  perDbScrapeDuration
};
