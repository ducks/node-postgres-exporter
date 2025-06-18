function registerHealthEndpoints(app, pools) {
  app.get('/healthz', (_, res) => res.status(200).send('OK'));
  app.get('/livez', (_, res) => res.status(200).send('OK'));
  app.get('/readyz', async (_, res) => {
   for (const { name, pool } of pools) {
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
      } catch (err) {
        console.error(`[READYZ] Database "${name}" not ready: ${err.message}`);
        return res.status(500).send(`Not Ready: ${name}`);
      }
    }
    res.status(200).send('OK');
  });
}

module.exports = registerHealthEndpoints;
