import { describe, it, expect } from 'vitest';
import { register } from '../metrics.js';

describe('Core Metrics Registration', () => {
  it('registers base metrics', () => {
    const metricNames = register.getMetricsAsArray().map(m => m.name);

    expect(metricNames).toContain('pg_active_connections');
    expect(metricNames).toContain('pg_database_size_bytes');
    expect(metricNames).toContain('exporter_up');
    expect(metricNames).toContain('exporter_errors_total');
    expect(metricNames).toContain('exporter_scrape_duration_seconds');
  });
});
