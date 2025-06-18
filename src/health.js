function registerHealthEndpoints(app, pool) {
  app.get('/healthz', (_, res) => res.status(200).send('OK'));
  app.get('/livez', (_, res) => res.status(200).send('OK'));
  app.get('/readyz', async (_, res) => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      res.status(200).send('OK');
    } catch (err) {
      res.status(500).send('Not Ready');
    }
  });
}

module.exports = registerHealthEndpoints;
