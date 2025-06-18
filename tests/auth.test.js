import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import createAuthMiddleware from '../auth.js';

describe('Auth Middleware', () => {
  const API_KEY = 'test-key';
  const app = express();

  app.get('/protected', createAuthMiddleware(API_KEY), (_, res) => res.send('OK'));

  it('rejects requests without auth', async () => {
    const res = await request(app).get('/protected');
    expect(res.statusCode).toBe(403);
  });

  it('accepts request with valid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${API_KEY}`);
    expect(res.statusCode).toBe(200);
  });

  it('rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.statusCode).toBe(403);
  });
});
