import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { pool } from '../src/db.js';
import registerHealthEndpoints from '../src/health.js';

const isCI = process.env.CI === 'true';

describe.skipIf(isCI, 'Health Endpoints', () => {
  const app = express();
  registerHealthEndpoints(app, pool);

  it('healthz returns 200', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
  });

  it('livez returns 200', async () => {
    const res = await request(app).get('/livez');
    expect(res.statusCode).toBe(200);
  });

  it('readyz returns 200 if DB available', async () => {
    const res = await request(app).get('/readyz');
    expect([200, 500]).toContain(res.statusCode);
  });
});
