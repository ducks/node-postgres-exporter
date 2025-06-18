function createAuthMiddleware(apiKey) {
  return (req, res, next) => {
    if (!apiKey) {
      console.warn('[AUTH] No API key set');
      return res.status(403).send('Forbidden');
    }

    const authHeader = req.headers['authorization'];
    const expected = `Bearer ${apiKey}`;

    if (!authHeader || authHeader !== expected) {
      return res.status(403).send('Forbidden');
    }

    next();
  }
}
module.exports = createAuthMiddleware;
