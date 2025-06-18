require('dotenv').config();

const API_KEY = process.env.EXPORTER_API_KEY || null;

function authMiddleware(req, res, next) {
  if (!API_KEY) {
    console.warn('[AUTH] No API key set; rejecting all requests');
    return res.status(403).send('Forbidden');
  }

  const authHeader = req.headers['authorization'];
  const expected = `Bearer ${API_KEY}`;

  if (!authHeader || authHeader !== expected) {
    return res.status(403).send('Forbidden');
  }

  next();
}

module.exports = authMiddleware;

