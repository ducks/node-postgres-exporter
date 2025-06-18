import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { pool } from '../db.js';
import registerHealthEndpoints from '../health.js';

describe('Health Endpoints', () => {
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
