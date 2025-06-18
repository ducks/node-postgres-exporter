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
});
register.registerMetric(pgActiveConnections);

const pgDatabaseSize = new client.Gauge({
  name: 'pg_database_size_bytes',
  help: 'Database size in bytes',
  labelNames: ['database'],
});
register.registerMetric(pgDatabaseSize);

// Export everything we need
module.exports = {
  client,
  register,
  exporterUp,
  scrapeDuration,
  exporterErrors,
  pgActiveConnections,
  pgDatabaseSize,
};
