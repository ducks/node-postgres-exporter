import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Registry } from 'prom-client';
import { loadCustomMetrics } from '../customMetrics.js';

const tempFile = path.join(__dirname, 'queries.test.json');

describe('Custom Metrics Loader', () => {
  beforeEach(() => {
    // Clean up any old test file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('loads valid queries.json', () => {
    const queries = [
      {
        name: 'test_metric',
        help: 'Test Metric',
        type: 'gauge',
        query: 'SELECT 1',
        labels: []
      }
    ];

    fs.writeFileSync(tempFile, JSON.stringify(queries));

    const register = new Registry();
    loadCustomMetrics(register, tempFile);

    const metrics = register.getMetricsAsArray().map(m => m.name);
    expect(metrics).toContain('test_metric');
  });

  it('rejects invalid queries file', () => {
    fs.writeFileSync(tempFile, '{ invalid json }');

    const register = new Registry();
    expect(() => loadCustomMetrics(register, tempFile)).not.toThrow();  // It logs but does not throw
  });
});
